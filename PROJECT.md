# TravelOS — Project Architecture

This document records the architectural decisions behind TravelOS and is the
canonical reference for how the codebase is organized. It is updated as the
architecture evolves — treat it as living documentation, not a one-time
design doc.

Status: **Milestones M0 → M4 Sprint 2 complete.** Delivered so far: the
M0 identity/tenancy/auth/RBAC foundation; M1 Packages + Itinerary Builder;
M2 Suppliers & Inventory (Hotels, Transport, Guides, Suppliers, Activities,
Destinations + package inventory, global search, dashboard); M3 CRM, Leads,
Documents, Provider integration foundation, Settings; M3 External
Integrations (Duffel/Hotelbeds/Amadeus) and M3.1 per-tenant encrypted
credentials (§15); **M4 Sprint 1 — Booking Engine Core (§16)**; and **M4
Sprint 2 — Pricing & Quotes (§17)** (quote lifecycle, automated pricing from
inventory rates, and one-click quote→booking conversion). Not yet built:
invoicing, payments, finance, website, AI. Section §1–§13 below document the
M0 foundation and remain the canonical reference for the patterns every later
module follows; §14 is the historical M0 roadmap.

---

## 1. Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5.20 |
| UI runtime | React | 19.2.4 |
| Language | TypeScript | 5.x, strict mode |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui (hand-authored — see §9) | "new-york" style |
| Database | PostgreSQL | 16 (Neon in production) |
| ORM | Prisma | 6.19.3 |
| Auth | Auth.js (NextAuth) | 5.0.0-beta.31 |
| Validation | Zod | 4.x |
| Forms | React Hook Form + @hookform/resolvers | 7.x / 5.x |
| Server-state cache | TanStack Query | 5.x |
| File storage | UploadThing (behind a provider abstraction) | 7.x |
| Password hashing | bcryptjs | 3.x |

**Why Next 15, not 16:** `create-next-app@latest` defaults to Next 16
today. The stack was explicitly pinned to **Next.js 15 / React 19** per
requirements, so the scaffold was re-pinned to `next@15.5.20` and
`eslint-config-next@15.5.20` immediately after generation, and
`eslint.config.mjs` was rewritten using the `FlatCompat` bridge (the
standard Next-15-era pattern) because the Next-16 flat-config import style
doesn't work against the 15.x version of `eslint-config-next`.

**Why Prisma 6, not 7:** Prisma 7 (current latest at time of writing)
changes several defaults (a required `prisma.config.ts`, different client
output location/module format). Prisma 6.19.3 is the last stable line on
the well-established `schema.prisma` + `node_modules/@prisma/client`
workflow this document describes. Revisit this pin once Prisma 7 has had
time to stabilize in the ecosystem.

---

## 2. Architecture style: modular monolith, feature-first

One Next.js application, not microservices. At the scale this product
targets (thousands of small/medium travel agencies), a modular monolith
with disciplined internal boundaries scales further than the operational
cost of a distributed system justifies. Boundaries are enforced by
*convention and folder structure*, not network calls — see §3.

Within that monolith, three loose layers:

```
Presentation   → app/ (routing, layout — stays thin, no business logic)
Application    → features/*/actions, features/*/queries (Server Actions, data access)
Infrastructure → shared/lib (Prisma client, auth, storage, permissions)
```

`app/` never imports Prisma directly. It calls a Server Action or query
function from `features/*`. This is Clean-Architecture-*flavored*, not
doctrinaire hexagonal — there's no repository-interface indirection for its
own sake, because with a single Postgres database there's nothing to
abstract yet.

---

## 3. Folder structure

```
prisma/
  schema.prisma              # data model (see §4)
  migrations/                # Prisma Migrate history
  sql/001_row_level_security.sql   # RLS policies — NOT yet applied, see §4.3

src/
  app/                        # routing only
    (marketing)/               # public site — page.tsx is the "/" route
    (auth)/                    # sign-in, sign-up — shared centered-card layout
    (dashboard)/[tenantSlug]/  # tenant-scoped app: layout does the auth gate
    onboarding/                 # post-signup: create-first-tenant flow
    api/
      auth/[...nextauth]/       # Auth.js route handler
      uploadthing/               # UploadThing route handler
      v1/{public,webhooks}/     # reserved for versioned external API (empty — M0 has no external API yet)

  features/                   # one folder per domain, vertical slices
    auth/        {actions, components, schemas}
    tenants/     {actions, components, queries, schemas}
    # `users` and a dedicated `auth/queries` folder are NOT created yet —
    # nothing needs them before a business module does; add on demand.

  shared/                     # cross-feature infrastructure
    components/ui/             # shadcn/ui primitives (button, form, dialog, ...)
    lib/
      db.ts                     # Prisma client + tenant-scoped extension (§4.2)
      auth.ts / auth.config.ts  # Auth.js — split for edge/Node (§5)
      permissions/               # RBAC (§6)
      storage/                   # StorageProvider abstraction (§8)
    providers/                 # QueryProvider, AppProviders (root composition)
    config/env.ts               # Zod-validated environment variables

  middleware.ts                # edge-safe "are you logged in" gate (§5.3)
  types/next-auth.d.ts          # Auth.js module augmentation
```

`entities/` (cross-feature domain types) is in the target structure but
doesn't exist as a directory yet — there's nothing to put there until a
second feature needs to share a domain type. Git doesn't track empty
directories; it will appear when the first business module needs it.

---

## 4. Database strategy

### 4.1 Schema (M0)

Only the identity/tenancy/audit backbone exists:

- **Tenant** — a travel agency. `slug` is the path-based routing key.
- **User** — a person, tenant-agnostic. `passwordHash` is null for
  OAuth-only users.
- **Membership** — join table: `(tenantId, userId) → role`. A user can
  belong to multiple tenants (e.g. a freelance consultant).
- **Invitation** — pending invite, not yet wired to any UI (schema only —
  see §9).
- **Account / Session / VerificationToken** — required by
  `@auth/prisma-adapter`'s type contract (`Session` specifically is unused
  under the JWT session strategy but must exist for the adapter to
  type-check — see the model's doc comment in `schema.prisma`).
- **AuditLog** — append-only, `tenantId`/`userId` nullable (`SetNull` on
  delete) so a deleted tenant/user doesn't destroy its own audit trail.
  Not written to by anything yet — the table exists so the first
  audited mutation doesn't require a migration.

IDs are `cuid()`, not auto-increment integers — avoids sequential-ID
enumeration and doesn't assume single-writer semantics.

### 4.2 Multi-tenancy: shared schema, two independent enforcement layers

Every tenant-scoped table carries a `tenantId` column (shared-schema
multi-tenancy — no schema-per-tenant, no database-per-tenant). Two layers
enforce isolation, and neither is trusted alone:

1. **Application layer** — `getTenantDb(tenantId)` in `shared/lib/db.ts`
   returns a Prisma Client Extension that auto-injects `tenantId` into
   `findMany`/`count`/`aggregate`/`groupBy`/`updateMany`/`deleteMany`/`create`/`createMany`
   for an explicit allowlist of tenant-scoped models. **It does NOT
   auto-scope `findUnique`/`update`/`delete`** (a unique `where: { id }`
   can't safely have `tenantId` folded in without knowing the exact key
   shape) — callers must pass `tenantId` explicitly for single-record
   operations. This is a real, documented gap, not an oversight; see §10.

2. **Database layer (Postgres RLS)** — `prisma/sql/001_row_level_security.sql`
   defines Row-Level Security policies keyed on
   `current_setting('app.current_tenant_id')`. **This file is written and
   schema-validated against a live Postgres 16 instance, but is NOT
   currently applied to any database and must not be, yet** — see §10 for
   why (short version: the app doesn't set that session variable per
   request yet, so enabling these policies today would make every
   tenant-scoped query silently return zero rows).

3. **Authorization layer (separate from the two above)** —
   `requireTenantMembership()` / `requirePermission()` in
   `shared/lib/permissions/guard.ts` check "does this user have a role in
   this tenant at all" against the database directly, before any query
   runs. See §6 for why this hits the DB instead of a cache.

### 4.3 RLS status in detail

`prisma/sql/001_row_level_security.sql` is real, tested SQL (applied to and
verified against a scratch Postgres 16 database during M0, including fixing
a column-name bug — Prisma keeps model fields camelCase at the column level
unless a field has an explicit `@map`, so policies must reference
`"tenantId"`, not `tenant_id`). It is deliberately **not wired into
`prisma migrate dev`** (Prisma Migrate doesn't manage RLS) and deliberately
**not enabled on any environment yet**, because `getTenantDb()` doesn't run
`SET LOCAL app.current_tenant_id` before its queries. Enabling the policies
before that's wired would silently break every tenant-scoped read (RLS
fails closed: no session variable set → policy never matches → empty
result set, not an error). Turning this on is tracked, sequenced work — see
§10.

### 4.4 Migrations

Prisma Migrate, `prisma/migrations/`. One migration exists:
`20260709151208_init`. CI should run `prisma migrate diff` against a
preview database branch before merge (not yet wired — no CI exists yet,
see §10).

---

## 5. Authentication strategy

### 5.1 Providers

- **Credentials** (email + bcrypt-hashed password, 12 rounds) — implemented
  and tested end-to-end.
- **Google OAuth** — wired but conditionally registered (`AUTH_GOOGLE_ID`/
  `AUTH_GOOGLE_SECRET` unset in dev → provider omitted, not broken). Not
  exercised end-to-end (would require real Google OAuth credentials).

### 5.2 Session strategy: JWT, split edge/Node config

Two config files:

- `shared/lib/auth.config.ts` — edge-safe. No Prisma, no bcrypt. Exported
  as `authConfig` and used by both `middleware.ts` and (spread into)
  `auth.ts`.
- `shared/lib/auth.ts` — full config: providers, `PrismaAdapter`, the
  `jwt`/`session` callbacks that read `Membership` rows from the database.
  Only ever runs in Node.js route handlers / Server Actions.

This split exists because `middleware.ts` runs on the Edge runtime, which
cannot load Prisma or bcrypt — importing them there breaks the build (this
was verified: the initial single-file config produced Edge Runtime warnings
about `CompressionStream`/`DecompressionStream` from `jose` deep in the
`@auth/core` import graph until the split was applied to `auth.config.ts`).

### 5.3 What middleware actually checks — and why it's deliberately coarse

`middleware.ts` gates every non-public route on one question: **is there a
logged-in user at all.** It does **not** check whether that user belongs to
the specific tenant in the URL, even though the JWT carries a cached
`memberships` list that looks like it should support that check.

This was a design correction made during M0, not the original design.
The first version of `authConfig.callbacks.authorized` *did* check
`auth.memberships.some(m => m.tenantSlug === tenantSlug)` at the edge. It
was caught by an end-to-end test (Playwright, driving a real signup →
create-tenant → dashboard flow against a live Postgres instance): a user
who had just created their first tenant was immediately bounced back to
sign-in when navigating to it, because the JWT's cached `memberships`
claim is only refreshed on next full sign-in (or an explicit client-side
`update()` call) — it does not know about a membership created ten
milliseconds ago in the same request cycle. See §10 for the full
diagnosis; the fix was architectural, not a timing patch: **membership
authorization now always reads the database directly**
(`requireTenantMembership()`), and the JWT's `memberships`/`activeTenantId`
claims are documented (in `auth.ts`, inline) as **display-only** — safe for
a workspace switcher, unsafe as an authorization source.

### 5.4 Tenant routing

Path-based: `travelos.com/<tenantSlug>/...`. No subdomain/custom-domain
support yet (would be a later milestone — white-labeling).

### 5.5 Onboarding flow

`sign-up` → `signIn()` (credentials) → redirect to `/onboarding` → if the
user already has a membership (JWT cache — acceptable staleness here, see
§10), redirect to their first tenant; otherwise render `CreateTenantForm`,
which calls a Server Action that creates a `Tenant` + an `OWNER`
`Membership` in one `$transaction`, then the client does a plain
`router.push`/`router.refresh` (no session-refresh dance needed — see
§5.3, authorization is DB-backed on arrival).

---

## 6. RBAC implementation

`shared/lib/permissions/`:

- **`permissions.ts`** — pure, synchronous. A flat, explicit allow-list
  matrix: `Record<MembershipRole, PermissionKey[]>` where
  `PermissionKey = "${Resource}:${Action}"`. Deny-by-default — anything not
  listed is not permitted. Deliberately *not* hierarchical/inherited role
  levels, because implicit inheritance is exactly the mechanism that grants
  silent excess access as a permission matrix grows; every grant is a
  visible, individually-reviewable line.
- **`guard.ts`** — the I/O layer:
  - `requireSession()` — throws `AuthError("UNAUTHENTICATED")` if no
    session.
  - `requireTenantMembership(tenantId)` — throws
    `AuthError("NO_TENANT_ACCESS")` unless a database-backed `Membership`
    lookup finds an ACTIVE row for `(tenantId, currentUserId)`. Returns the
    resolved role and a tenant-scoped Prisma client
    (`getTenantDb(tenantId)`) in one call.
  - `requirePermission(tenantId, resource, action)` — layers `can()` on
    top of `requireTenantMembership`, throws `AuthError("FORBIDDEN")` if
    the role doesn't grant it.
  - `requireTenantMembershipOrNotFound` /
    `requirePermissionOrNotFound` — Server Component variants. A
    cross-tenant page request should render a plain 404, not leak a
    500/stack trace (and not confirm/deny the tenant's existence to an
    unauthorized caller) — the raw `guard.ts` functions throw `AuthError`
    for Server Actions to convert into a typed error result; these
    `*OrNotFound` wrappers catch that and call Next's `notFound()` for
    pages/layouts instead. This split also fixed a real bug caught by
    testing: the first version let `AuthError` propagate uncaught from
    `[tenantSlug]/settings/page.tsx`, producing a 500 instead of a 404 for
    a cross-tenant request.

Roles (`MembershipRole` enum in `schema.prisma`): `OWNER`, `ADMIN`,
`AGENT`, `ACCOUNTANT`, `READ_ONLY`. Resources as of M0: `tenant`,
`membership`, `invitation` — business modules will register their own
resources in `permissions.ts` when they land.

**Verified, not just written:** an isolation test (two independent
Playwright browser contexts, two separate users, two separate tenants) 
confirmed User B gets a genuine `404` accessing User A's `/settings`
route, and that User A retains normal `200` access to their own tenant.

---

## 7. State management

- **Server Components** do the default data fetch (tenant lookup,
  membership resolution, member list) — no client-side waterfall for
  initial page content.
- **TanStack Query** — `QueryProvider` is mounted (`shared/providers/`),
  configured with a `staleTime` of 60s and per-request `QueryClient`
  instantiation on the server vs. a singleton in the browser (the standard
  App Router pattern, avoids leaking one tenant's cached data into another
  request server-side). **Not yet consumed by any hook** — there's no
  business-module list/table view yet that needs client-side
  filtering/refetching. The provider exists so the first feature that
  needs it doesn't also need a provider-wiring PR.
- **React Hook Form + Zod** — every form (`sign-in`, `sign-up`,
  `create-tenant`) uses `zodResolver`, and the same Zod schema is
  re-validated server-side inside the Server Action (`schemas/*.schema.ts`
  is the single source of truth for both).
- **Zustand, nuqs** — installed (per the approved architecture, for future
  multi-step wizards / URL-driven filter state) but **not yet imported
  anywhere**. Nothing in M0 needs client-only ephemeral state or
  URL-as-state. Listed explicitly in §10 as an installed-but-unused
  dependency rather than silently left out of this document.

---

## 8. File storage

`shared/lib/storage/`:

- **`types.ts`** — `StorageProvider` interface (`delete`, `getUrl`).
  Feature code depends on this, never on a concrete provider.
- **`uploadthing-provider.ts`** — the default adapter. `UTApi` is
  constructed lazily (inside the function that needs it, not at module
  load) specifically so importing this file never requires
  `UPLOADTHING_TOKEN` to be set — it isn't, in local dev, and the build
  must not depend on it.
- **`index.ts`** — exports `storage = uploadThingProvider`. Swapping to a
  Cloudflare R2/S3 adapter later (justified in the original architecture
  proposal on PII/compliance/cost grounds once the product handles
  passport scans etc.) is a one-line change here, not a call-site rewrite.
- **`file-router.ts`** — one generic authenticated UploadThing route
  (`attachment`) proving the pipeline (auth → upload → storage adapter) is
  wired end to end. No business module owns a dedicated route yet.

---

## 9. shadcn/ui: hand-authored, not registry-fetched

`npx shadcn@latest init` failed in this environment — `ui.shadcn.com` is
blocked by the sandbox's outbound network policy (gateway returned 403 to
the CONNECT request). Rather than work around the network policy,
`components.json` was hand-written and the "new-york"-style component
source (button, input, label, card, form, dialog, dropdown-menu, avatar,
separator, badge, sonner, select, tabs) was authored directly — this is
the same code the CLI would have generated; shadcn/ui's model is "copy the
source into your repo," not a runtime package. Component aliases in
`components.json` point into `shared/components/*` to match this project's
feature-based structure rather than the CLI's default `components/*`.

---

## 10. What is production-ready

- Sign-up, sign-in, sign-out (credentials) — tested end-to-end against a
  live Postgres 16 database via an automated Playwright flow, not just
  "it builds."
- Tenant creation + OWNER membership assignment (atomic `$transaction`).
- Tenant-scoped authorization (`requireTenantMembership`/`requirePermission`)
  — DB-backed, verified to correctly block cross-tenant access (404, not
  500) and correctly allow same-tenant access, via an automated two-user
  isolation test.
- RBAC permission matrix and guard layer.
- Strict TypeScript, Zod validation shared client/server, RHF integration.
- Production build (`next build`) is clean: no type errors, no lint
  warnings, no Edge Runtime incompatibility warnings.
- Tenant-scoped Prisma Client Extension for list/aggregate/create
  operations.

## 11. What is a placeholder

- **Row-Level Security policies** (`prisma/sql/001_row_level_security.sql`)
  — written and schema-validated, **not applied to any database**. Do not
  apply until `getTenantDb()` sets `app.current_tenant_id` per request (see
  §10, technical debt, below).
- **`app/api/v1/{public,webhooks}`** — empty directories reserved for the
  versioned external API described in the original architecture proposal.
  Nothing lives there yet; no external integrations exist in M0.
- **`Invitation` model** — exists in the schema, has no Server Action, no
  UI, no email-sending. Team members can currently only be added by
  creating the Tenant itself (as OWNER) — there's no "invite a teammate"
  flow yet.
- **Google OAuth** — code path exists and is conditionally registered, but
  untested end-to-end (needs real OAuth app credentials this environment
  doesn't have).
- **Zustand, nuqs** — installed, unused. See §7.
- **TanStack Query** — provider mounted, no consuming hook yet. See §7.
- **`entities/` directory** — part of the target structure, doesn't exist
  yet (nothing to put there).

## 12. Technical debt taken on intentionally for M0

1. **`getTenantDb()` doesn't auto-scope `findUnique`/`update`/`delete`.**
   Documented in code (`shared/lib/db.ts`) and here. Feature-layer queries
   for single-record operations must pass `tenantId` explicitly in the
   `where` clause. Mitigated by `requireTenantMembership`/`requirePermission`
   running first in every code path that reaches these queries — but it's
   still a manual-discipline requirement, not a structural guarantee, until
   RLS is turned on.
2. **RLS is written but not enabled anywhere** (§4.3, §11). Sequencing:
   wire `SET LOCAL app.current_tenant_id` into `getTenantDb()` inside a
   transaction, verify against a scratch database the same way this
   milestone verified the policies' SQL syntax, *then* enable.
3. **JWT-cached `memberships`/`activeTenantId` are display-only, and
   nothing currently keeps them fresh after a mutation.** This was
   discovered as a real bug during M0 (see §5.3) and fixed by moving
   authorization off the cache entirely — but the cache itself can still
   show a newly-created tenant as "not there yet" in any future UI (like a
   workspace switcher) until the next sign-in. Acceptable for M0 (no such
   UI exists yet); revisit with a real update-and-await mechanism (client
   `useSession().update()`, awaited before navigation — this was actually
   built and verified to work correctly in isolation during debugging, then
   removed because it became unnecessary once authorization moved to the
   database; it's a viable option to reintroduce for cache-freshness alone
   if a switcher UI needs it) before shipping anything that displays that
   cache as fact.
4. **No CI pipeline yet.** `npm run build` and the Playwright smoke/isolation
   tests used to verify this milestone were run manually against a local
   Postgres instance, not wired into GitHub Actions. Tracked for the
   milestone that introduces the deployment pipeline.
5. **No automated test suite committed.** The Playwright scripts that
   verified the auth/tenancy/RBAC flows during this milestone were
   throwaway scratch scripts (not committed) run against a temporary local
   Postgres instance — not a maintained `tests/` suite. Standing up
   Playwright/Vitest as a committed, CI-run suite is deferred; M0's goal
   was a verified foundation, not a test harness.
6. **`npm audit` reports 8 advisories** (4 moderate, 4 high), all in
   transitive dependencies (`effect`, pulled in by `uploadthing`'s
   dependency graph; `postcss`, bundled inside `next` itself). `npm audit
   fix --force` would downgrade `uploadthing` to 6.12.0 and `next-auth` to
   3.29.10 — both would break the app outright and are not real fixes.
   Left as-is; revisit when upstream releases patched versions.

---

## 13. Deployment strategy (target — not yet implemented)

Unchanged from the original architecture proposal, restated here for
reference since M0 doesn't implement any of it yet:

| Layer | Choice |
|---|---|
| App hosting | Vercel |
| Database | Neon (branch-per-PR previews) |
| File storage | UploadThing → Cloudflare R2 migration path (§8) |
| Background jobs | Inngest (not yet needed — no async work exists in M0) |
| Email | Resend + React Email (not yet needed — no emails sent in M0) |
| CI/CD | GitHub Actions: lint, typecheck, `prisma migrate diff` gate, Vercel preview deploy |

## 14. Roadmap

M0 (this milestone) → M1 CRM & Tenant Management (team invites, roles UI)
→ M2 Bookings & Itineraries core → M3 Quotes/Invoicing/Payments → M4
Documents & Communication → M5 Reporting → M6 AI Features → M7 Public API &
White-label → M8 Scale Hardening (RLS enforcement, load testing).

---

## 15. M3.1 — Multi-Tenant Provider Credentials

External integrations (Duffel, Hotelbeds, Amadeus) are **per-tenant**: each
agency connects its own provider account and its credentials are encrypted
independently. No live client reads ambient/env credentials directly.

### Credential resolution (`features/integrations/lib/resolve-credentials.ts`)
`resolveTenantCredentials(db, tenantId, type)` is the single decision point:

1. **Tenant credentials** — decrypts the agency's own `ProviderCredential`
   rows (AES-256-GCM) attached to its `ProviderConnection`. Source `"tenant"`.
2. **Platform fallback** (optional, `ALLOW_ENV_FALLBACK`) — env vars, used
   only when the tenant has none. Source `"environment"`, surfaced in the UI
   as "Shared platform credentials" so it is never mistaken for production.
3. Otherwise the provider is reported not configured for that tenant.

### Client construction
`DuffelClient` / `HotelbedsClient` / `AmadeusClient` take credentials via
their constructor — they hold no env token. `lib/client-factory.ts` resolves
the tenant's credentials and returns a client bound to them; every search /
sync / health action goes through it, so one tenant can never use another's
account. Hotelbeds `test`/`live` comes from `ProviderConnection.environment`.

### Storage & isolation
Credentials live in the M2 `ProviderCredential` table (encrypted columns
`encryptedValue`/`iv`/`authTag`), scoped by `tenantId` + tenant-scoped Prisma
client. Plaintext is never persisted, returned to the client, or written to
audit logs (only credential *type* names are audited). `.env.local` is
gitignored and used only as the optional dev/platform fallback.

### Wizard & migration (`Settings → Integrations`)
- **Connect / Update** — per-provider dialog captures the agency's keys,
  encrypts, saves, sets the connection PENDING (write-only; secrets are never
  pre-filled, so the same dialog rotates credentials).
- **Test Connection** — health check against the tenant's own resolved keys.
- **Adopt platform keys** — one-click migration copying the shared env
  credentials into the tenant's encrypted store to then rotate.
- **Disconnect** — deletes the tenant's credential rows, sets DISCONNECTED.
- Every card shows its credential source badge: *Agency's own account* /
  *Shared platform credentials* / *No credentials*.

### Verdict
TravelOS is a true multi-tenant SaaS: Agency A and Agency B connect
completely independent Duffel / Hotelbeds / Amadeus accounts, stored encrypted
and isolated per workspace. The env credentials remain only as an optional,
clearly-labelled platform fallback for development.

---

## 16. M4 Sprint 1 — Booking Engine Core

The keystone reservation module every downstream money feature (quotes,
invoicing, payments) will build on. This sprint is deliberately scoped to the
booking *record and its lifecycle* — **no payment, invoicing, or automated
pricing-rules logic** (those are later sprints). It reuses the exact patterns
established in M0–M3: tenant-scoped Prisma client, `requirePermission` guards,
`ActionResult`, Zod schemas shared client/server, audit logging, and an
activity timeline mirroring CRM/Leads.

### Data model (`prisma/schema.prisma`)
- **Booking** — a reservation for a `Customer`, optionally linked to a
  `Package` and an assigned agent (`ownerId`). Carries a per-tenant unique,
  human-readable `reference` (`BK-<year>-<seq>`), traveller counts, travel
  dates, `currency`, and stored money columns (`subtotal`/`discount`/`tax`/
  `total`). Monetary totals are **stored, not computed on read**, so list and
  report queries stay cheap and a booking's recorded price is stable even if
  inventory prices later move.
- **BookingItem** — a priced line (`type`, `description`, `quantity`,
  `unitPrice`, captured `amount`). `referenceId` is an **FK-free** optional
  pointer back to an inventory record (hotelId, activityId, …) so inventory
  can change without rewriting historical bookings.
- **BookingActivity** — append-only timeline (created / updated / status
  changed / assigned / item added·updated·removed / cancelled).
- Enums: `BookingStatus`, `BookingItemType`, `BookingActivityType`.
- Migration `20260711105452_add_booking_engine`. Registered in
  `TENANT_SCOPED_MODELS` (db.ts) and `booking` added to `CRM_RESOURCES` in
  `permissions.ts` (agents book; managers/admins archive/delete).

### Domain layer (pure, unit-tested — `features/bookings/lib/`)
- **`status.ts`** — the single source of truth for the lifecycle
  `DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED` plus `CANCELLED` from any open
  state; `CONFIRMED` may drop back to `DRAFT` to re-quote. `COMPLETED` and
  `CANCELLED` are terminal. The DB does not enforce transitions —
  `canTransition()` does, in the action layer and the UI.
- **`totals.ts`** — money math in integer cents (no float drift);
  `total = max(0, subtotal − discount + tax)` so a discount can never produce a
  negative amount owed.
- **`reference.ts`** — reference formatting/parsing; the sequence is allocated
  from a per-tenant, per-year count in the action, with the
  `@@unique([tenantId, reference])` constraint as the final race guard.
- **`recompute-totals.ts`** (server-only) — re-derives and persists
  `subtotal`/`total` from current items + discount/tax after every mutation, so
  stored totals never drift from the lines.

### Actions, queries, UI
- **Actions** — `booking.action.ts` (create / update / status / cancel /
  assign / soft-delete) and `booking-item.action.ts` (add / update / remove,
  each recomputing totals). Line-item edits are blocked once a booking is
  terminal. Every mutation writes an audit row and a timeline entry.
- **Queries** — `listBookings` (+ `getBookingStats`: counts by status, active
  revenue, upcoming), `getBooking` (detail with items + timeline),
  `booking-options` (customer/package selects).
- **UI** — `/[tenantSlug]/bookings` list (stats, URL-driven filter bar,
  pagination), `/new` (header form; guides the user to create a customer first
  if none exist), `/[bookingId]` detail (line-item editor with live line
  amounts, totals summary, status actions, assignment, timeline). "Bookings"
  added to the dashboard nav after Leads.

### Tests & gates
22 new Vitest unit tests (totals, status transitions, reference formatting,
booking permissions) — suite total **73 passing**. `npm run lint` clean,
`npm run build` clean.

### Deferred to later M4 sprints (intentional)
~~Automated pricing from package/inventory rates, quotes/proposals~~ (delivered
in Sprint 2, §17), invoicing, payments/deposits, cancellation-policy
enforcement, and traveller (pax) detail records. The schema and lifecycle were
designed so these are additive.

---

## 17. M4 Sprint 2 — Pricing & Quotes

The pre-sale half of the revenue funnel: a **Quote** is a priced proposal a
customer receives before a booking exists, and an accepted quote converts
one-to-one into a Booking. This sprint also closes the manual-pricing gap
Sprint 1 left open by seeding line prices from inventory rates. It reuses every
pattern from M0–M4 Sprint 1 (tenant-scoped Prisma client, `requirePermission`
guards, `ActionResult`, Zod shared client/server, audit logging, activity
timeline, stored integer-cents totals) — no new architectural decision.

### Shared money module (refactor, not rebuild)
The pure integer-cents arithmetic that Sprint 1 put in
`features/bookings/lib/totals.ts` moved to **`shared/lib/money.ts`** so bookings
and quotes share one source of truth. `bookings/lib/totals.ts` now re-exports it
under its original names, so existing call sites and tests are unchanged. The
formula is identical: `total = max(0, subtotal − discount + tax)`, all in cents.

### Data model (`prisma/schema.prisma`)
- **Quote** — mirrors Booking (customer, optional package, assigned agent,
  traveller counts, travel dates, currency, stored `subtotal`/`discount`/`tax`/
  `total`) plus quote-specific fields: a per-tenant unique `QT-<year>-<seq>`
  `reference`, a `validUntil` expiry, customer-facing `terms`, and lifecycle
  timestamps (`sentAt`/`acceptedAt`/`declinedAt`/`convertedAt`). A unique
  `convertedBookingId` links a converted quote to the Booking it produced.
- **QuoteItem** — same shape as BookingItem (reusing the `BookingItemType`
  enum so conversion is a direct field copy); `referenceId` is the FK-free
  pointer to the inventory record the line/price came from.
- **QuoteActivity** — append-only timeline.
- Enums: `QuoteStatus` (`DRAFT → SENT → ACCEPTED → CONVERTED`, plus `DECLINED`/
  `EXPIRED`), `QuoteActivityType`. Migration `20260712090000_add_quotes`
  (generated offline via `prisma migrate diff` — no live DB needed). Registered
  in `TENANT_SCOPED_MODELS` (db.ts) and `quote` added to `CRM_RESOURCES`
  (permissions.ts, same grant shape as booking: agents draft/send, managers/
  admins delete).

### Domain layer (pure, unit-tested — `features/quotes/lib/`)
- **`quote-status.ts`** — the single source of truth for the lifecycle.
  `SENT`/`EXPIRED` can drop back to `DRAFT` to revise; only an `ACCEPTED` quote
  may convert; `DECLINED`/`EXPIRED`/`CONVERTED` are terminal. `canEditItems()`
  gates line edits to draft/sent; `canConvert()` gates conversion. The DB does
  not enforce transitions — this module does, in the action layer and the UI.
- **`quote-reference.ts`** — `QT-…` formatting/parsing (booking scheme, distinct
  prefix); the sequence is allocated per-tenant-per-year in the action with the
  `@@unique([tenantId, reference])` constraint as the race guard.
- **`recompute-totals.ts`** (server-only) — re-derives and persists totals from
  current items + discount/tax after every mutation.

### Automated pricing (`features/quotes/queries/pricing-catalog.query.ts`)
`getPricingCatalog` returns the tenant's priceable inventory grouped into
hotels (RoomType.basePrice), activities (Activity.sellingPrice), guides
(Guide.dailyRate) and transport (no rate → description-only seed). The line
editor's **"Add from catalog"** picker seeds a line's type, description,
`referenceId` and unit price from the chosen entry — the agent no longer types
prices by hand. Rates seeded are always the sellable figure, never internal
cost. Items with no configured rate seed everything but the price and prompt
the agent to enter it.

### Actions, queries, UI
- **Actions** — `quote.action.ts` (create / update / status / decline / assign /
  soft-delete / **convertQuoteToBooking**) and `quote-item.action.ts` (add /
  update / remove, each recomputing totals). Conversion copies the quote header
  + items onto a new `CONFIRMED` booking (its own `BK-` reference), marks the
  quote `CONVERTED`, links `convertedBookingId`, and writes a timeline entry on
  both records; it requires `booking:create` **and** `quote:update`, and is
  idempotent (an already-converted quote returns its existing booking). Line
  edits are blocked once a quote leaves draft/sent. Every mutation writes an
  audit row and a timeline entry.
- **Queries** — `listQuotes` (+ `getQuoteStats`: counts by status, open value,
  acceptance rate), `getQuote` (detail with items + timeline), plus the pricing
  catalog. Customer/package option lists are reused from the bookings feature.
- **UI** — `/[tenantSlug]/quotes` list (stats, URL-driven filter bar,
  pagination), `/new` (header form with validity + terms), `/[quoteId]` detail
  (catalog-seeded line editor, totals, status actions incl. **Convert to
  booking**, converted-booking link, timeline), `/[quoteId]/edit` (header edit,
  locked once decided). "Quotes" added to the dashboard nav after Bookings.

### Tests & gates
23 new tests (shared money math, quote status transitions, quote reference,
quote permissions) — suite total **96 passing**. `npm run lint` clean,
`npx tsc --noEmit` clean, `npm run build` clean (all four quote routes compile).

### Deferred to later sprints (intentional)
Invoicing, payments/deposits, cancellation-policy enforcement, per-quote PDF
export, emailing the quote to the customer, and traveller (pax) detail records.
**Invoicing & Payments is the next unit and involves money movement / a payment
provider — a major architectural decision that stops for human approval.**
