# TravelOS — Project Architecture

This document records the architectural decisions behind TravelOS and is the
canonical reference for how the codebase is organized. It is updated as the
architecture evolves — treat it as living documentation, not a one-time
design doc.

Status: **Milestones M0 → Supplier Order Execution sprint (§24) complete.** Delivered so far: the
M0 identity/tenancy/auth/RBAC foundation; M1 Packages + Itinerary Builder;
M2 Suppliers & Inventory (Hotels, Transport, Guides, Suppliers, Activities,
Destinations + package inventory, global search, dashboard); M3 CRM, Leads,
Documents, Provider integration foundation, Settings; M3 External
Integrations (Duffel/Hotelbeds/Amadeus) and M3.1 per-tenant encrypted
credentials (§15); **M4 Sprint 1 — Booking Engine Core (§16)**; **M4
Sprint 2 — Pricing & Quotes (§17)**; **M4 Sprint 3 — Invoicing & Payments
(§18)**; and **M4 Sprint 4 — Agency Operations (§19)** (traveller/PAX
management with passport validation and document scans, configurable
cancellation policies with automatic refund calculation, supplier
confirmations, printable service vouchers); and **M5-INT — Real Supplier
Integration, development mode (§21)** (live Duffel/Hotelbeds workflows:
price validation, checkrates revalidation, search-to-draft-booking bridge);
**Sprint X, Milestone 1 — Outbound Email Delivery (§22)** (provider-
agnostic email infrastructure, wired into invoice issuance); and the
**Communication Capability sprint (§23)** (a polymorphic
`CommunicationMessage` delivery record + `sendCommunication()`
orchestration layer used by every outbound message, and Team Invitations
as its first full consumer — create/resend/revoke/accept, rate-limited,
audited, with a reused sign-in/sign-up accept flow); and the **Supplier
Order Execution sprint (§24)** (a generic, provider-agnostic execution
engine — claim-based idempotency, a full lifecycle with fail-loud
reconciliation, and Duffel as the first implementation — turning a
validated flight offer into a real supplier order, HOLD by default so no
money moves without an explicit purchase). Not yet built: PDF document
delivery, online payment gateway, background jobs, Hotelbeds/Amadeus
execution adapters, finance reporting, website, AI. Section §1–§13
below document the M0 foundation and remain the canonical reference for the
patterns every later module follows; §14 is the historical M0 roadmap.

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
~~Invoicing, payments/deposits~~ (delivered in Sprint 3, §18),
cancellation-policy enforcement, per-quote PDF export, emailing the quote to
the customer, and traveller (pax) detail records. **Invoicing & Payments was
flagged as a major decision and was approved before Sprint 3 began.**

---

## 18. M4 Sprint 3 — Invoicing & Payments

The post-sale half of the revenue funnel, closing the chain **Quote → Booking
→ Invoice → Payment(s)**. A Booking generates an Invoice; Payments are
recorded against the invoice until its balance settles; refunds and credit
notes adjust the position; deposits and installment plans schedule
collection. Every established pattern is reused (tenant-scoped Prisma client,
`requirePermission` guards, `ActionResult`, Zod shared client/server, audit +
timeline, stored integer-cents money columns).

### The approved architectural decision: ledger, not gateway
This sprint is a **payment recording ledger**, not a payment-gateway
integration. Small agencies receive money out-of-band (cash, bank transfer,
card terminal, cheque); TravelOS records it. `PaymentTransaction` is an
append-only CHARGE/REFUND ledger under each payment — rows are never updated
or deleted — designed so a future online-payments adapter (Stripe et al.)
just writes transactions into the same table. That keeps the gateway
decision (provider choice, webhooks, PCI surface) deferred without blocking
any of this sprint's functionality, and makes it additive when it lands.

### Shared modules (extended, not duplicated)
- **`shared/lib/money.ts`** grew three pure functions: `sumAmounts` (drift-
  free summation), `computeBalance` (`netPaid` / `amountOwed` / `balanceDue`
  clamped ≥ 0 / `settled`), and `allocateEvenly` (cents-exact even split —
  leftover cents go one each to the leading parts, so schedules always sum
  precisely).
- **`shared/lib/reference.ts`** (new): the `<PREFIX>-<year>-<seq>` formatting
  extracted from bookings/quotes — the same move Sprint 2 made with money —
  so BK/QT/INV/PAY/CN share one implementation. The booking and quote
  reference libs now delegate to it under their original export names; their
  tests are unchanged.

### Data model (`prisma/schema.prisma`)
- **Invoice** — mirrors Booking/Quote money discipline (stored `subtotal`/
  `discount`/`tax`/`total`) plus stored **balance columns** (`amountPaid`/
  `amountRefunded`/`amountCredited`) recomputed from the ledger after every
  financial mutation. `INV-<year>-<seq>` reference, optional `bookingId`
  (SetNull — deleting a booking never destroys financial records), customer
  Restrict, `issuedAt`/`dueDate`/`paidAt`/`voidedAt`+`voidReason`.
  Balance due = `total − credited − (paid − refunded)`, clamped at zero.
- **InvoiceItem** — same shape as BookingItem (reuses `BookingItemType`), so
  booking→invoice generation is a direct line copy. **InvoiceActivity** —
  append-only timeline.
- **Payment** — `PAY-<year>-<seq>`, method (CASH/BANK_TRANSFER/CARD/CHEQUE/
  ONLINE/OTHER), kind (DEPOSIT/INSTALLMENT/BALANCE), status (PENDING/
  COMPLETED/FAILED/REFUNDED/PARTIALLY_REFUNDED), `amount`+`refundedAmount`,
  optional `installmentId` link, `externalReference`, `recordedBy`. Invoice
  relation is **Restrict** — an invoice with payments cannot be hard-deleted.
- **PaymentTransaction** — the append-only CHARGE/REFUND ledger.
  **PaymentActivity** — per-payment timeline.
- **CreditNote** — `CN-<year>-<seq>` (numbered independently), ISSUED/VOID;
  voiding restores the owed amount but keeps the record.
- **InstallmentPlan** (one per invoice) + **Installment** — optional deposit
  (sequence 0) plus N scheduled amounts with due dates; installments flip to
  PAID when linked completed payments cover them (and back on refund).
- Migration `20260712120000_add_invoicing_payments` (offline via
  `prisma migrate diff`). All nine models registered in
  `TENANT_SCOPED_MODELS` (db.ts).

### RBAC: the ACCOUNTANT role gets its job
`FINANCE_RESOURCES = ["invoice", "payment"]` is a new grant list (not CRM):
OWNER/ADMIN full; **ACCOUNTANT view/create/update/manage** (records payments,
issues/voids invoices and credit notes, refunds — but never deletes);
AGENT view/create/update (drafts invoices, records payments — no void/refund);
READ_ONLY view. This is the first resource where ACCOUNTANT is more than a
viewer, which is exactly why finance got its own list.

### Domain layer (pure, unit-tested — `features/invoices/lib`, `features/payments/lib`)
- **`invoice-status.ts`** — lifecycle `DRAFT → ISSUED → PARTIALLY_PAID →
  PAID` + `VOID`. PARTIALLY_PAID/PAID are **system** states set only by the
  balance recompute (`deriveCollectionStatus`), never manual targets; refunds
  can reopen PAID. `canEditItems` (DRAFT only), `canIssue`, `canVoid` (open +
  nothing net-paid — refund first, then void), `canRecordPayment`,
  `canIssueCreditNote`, and `isOverdue` — **overdue is derived at read time**
  (open + past due + balance > 0), never stored, so it cannot go stale and
  needs no cron.
- **`installment-schedule.ts`** — pure schedule builder (deposit + N
  installments at a day interval) on `allocateEvenly`; typed errors; the
  schedule always sums cents-exact to the input.
- **`recompute-totals.ts` / `recompute-balance.ts`** (server-only) — totals
  from lines (drafts only); balance columns + collection status + installment
  settlement from live payments/credit notes after every financial mutation.
- **`invoice-reference.ts` / `payment-reference.ts`** — INV/CN/PAY prefixes on
  the shared reference module.

### Actions
- **`invoice.action.ts`** — create / **generateInvoiceFromBooking** (copies
  header + items onto a DRAFT invoice, timeline on both records; deliberately
  not idempotent — deposit + balance invoices per booking are legitimate) /
  update (draft-only) / **issue** (requires ≥1 line, positive total, due
  date; locks lines) / **void** (`invoice:manage`, reason required, blocked
  until net-paid is zero) / delete (drafts only — issued invoices are voided,
  never deleted).
- **`invoice-item.action.ts`** — add/update/remove, draft-only, recompute
  totals each time.
- **`credit-note.action.ts`** — issue (≤ amount still owed; money already
  received goes through refunds, not credits) / void. Both `invoice:manage`.
- **`installment.action.ts`** — create plan (issued invoices; schedule built
  from `total − credited`) / remove plan (blocked once payments link to it).
- **`payment.action.ts`** — **record** (open invoices only; amount ≤ balance
  due — overpayment is rejected; currency pinned to the invoice; writes the
  Payment + CHARGE transaction; optional PENDING for in-flight transfers) /
  complete / fail (pending only) / **refund** (`payment:manage`; ≤ unrefunded
  remainder; appends a REFUND transaction, flips payment status, reopens the
  invoice as needed). Every action recomputes the invoice balance and writes
  audit + timeline rows.

### Queries & UI
- **Queries** — `listInvoices` (+ `getInvoiceStats`: outstanding, collected,
  overdue count, by-status), `getInvoice` (items, timeline, payments with
  transactions, credit notes, installment plan, computed balance),
  `listInvoicesForBooking` (booking detail), `listPayments` (+
  `getPaymentStats`: collected this month, pending, refunded) for the
  tenant-wide payment history.
- **UI** — `/[tenantSlug]/invoices` list (outstanding/collected/overdue stat
  cards, status + overdue filters, balance-due column with overdue
  highlighting), `/new`, `/[invoiceId]` detail (line editor while draft,
  totals + balance card with %-collected progress bar, payment history with
  record/complete/fail/refund flows, credit notes, installment plan builder,
  issue/void actions, timeline), `/[invoiceId]/edit` (locked once issued),
  and `/[tenantSlug]/payments` (tenant-wide history + stats). The booking
  detail page gained an **Invoices** section with a "Generate invoice"
  button — the funnel's last link. "Invoices" and "Payments" added to the
  dashboard nav after Quotes.

### Tests & gates
43 new tests (money: balance/summation/allocation; invoice FSM incl. system
transitions and the fully-credited edge; overdue derivation; installment
schedules incl. cents-drift and date spacing; INV/CN/PAY references; finance
permissions for all five roles) — suite total **139 passing**. `npm run lint`
clean, `npx tsc --noEmit` clean, `npm run build` clean (all six new routes).

### Deferred (intentional)
Online payment gateway (the ledger is designed for it — see above), PDF
invoice export, emailing invoices/receipts, multi-currency settlement (a
payment's currency is pinned to its invoice), finance reporting/exports, and
cancellation-policy enforcement.

---

## 19. M4 Sprint 4 — Agency Operations

The operational layer that makes a confirmed booking runnable by a real
agency: who is travelling (with valid documents), what happens financially if
they cancel, whether each supplier has confirmed, and the vouchers the
customer hands over at check-in. Every established pattern is reused
(tenant-scoped Prisma client, `requirePermission` guards, `ActionResult`, Zod
shared client/server, audit + timeline, shared money/reference modules) — no
new architectural decision.

### Traveller (PAX) management (`features/travellers/`)
- **BookingTraveller** — owned by the booking (the same person on two
  bookings is two rows: a snapshot of what was true for that trip). Type
  (adult/child/infant), gender, DOB, nationality, passport (number / issuing
  country / issue / expiry), visa status (`VisaStatus` enum, UNKNOWN default)
  + notes, emergency contact, special requests, medical notes, frequent-flyer
  airline/number. Exactly one primary traveller per booking — enforced in the
  action layer (first added is primary; the flag moves atomically; removing
  the primary promotes the oldest remaining).
- **`passport-validation.ts`** (pure, tested) — MISSING / EXPIRED /
  EXPIRES_BEFORE_TRAVEL / EXPIRES_WITHIN_SIX_MONTHS (the common entry rule,
  checked against travel end when the booking has dates) / VALID, with
  problem/warning severity buckets badged in the UI.
- **Traveller documents add NO new model** — the M3 polymorphic `Document`
  (`ownerType: "traveller"`) and its UploadThing pipeline are reused;
  `DocumentCategory` gained INSURANCE / NATIONAL_ID / VACCINATION (additive
  migration). Tenant isolation is inherited from the document module.

### Cancellation engine (`features/cancellations/`)
- **CancellationPolicy + CancellationPolicyRule** — tenant-configurable
  tiers keyed on days-before-travel: NONE (free window) / PERCENTAGE of the
  booking total / FIXED amount; one policy may be the tenant default.
  Managed in Settings → Cancellation (rides the `settings` resource);
  assigned per booking (`booking:update`).
- **`cancellation-engine.ts`** (pure, tested) — picks the applicable tier
  (highest matching threshold; the `daysBefore: 0` tier is the catch-all,
  also used when the booking has no travel date), derives policy penalty +
  supplier penalty (both capped at the booking total), **refund due =
  max(0, net paid − total penalty)** and any outstanding penalty — all via
  the shared money module's cents-safe helpers. Net paid is summed from the
  booking's non-void invoices (Sprint 3's stored balance columns).
- **BookingCancellation** — the immutable outcome record written by
  `cancelBookingAction` (which now computes the outcome as part of the
  existing cancel flow — one code path, no parallel action): tier applied,
  amounts, snapshot of net paid, refund due, who/when/why. The money itself
  moves through the Sprint-3 payment refund flow; this documents what is
  owed. The booking detail's Cancellation panel shows a live "if cancelled
  today" preview computed by the same engine, and the record after.

### Supplier confirmations (`features/confirmations/`)
- **SupplierConfirmation** — at most one per booking line
  (`bookingItemId @unique`): PENDING → CONFIRMED (confirmation number
  required) / REJECTED (re-requestable). `supplierName` is captured text,
  FK-free like `BookingItem.referenceId`. Managed inline on the booking
  detail; every transition writes timeline + audit.

### Vouchers (`features/vouchers/`)
- **Voucher** — `VCH-<year>-<seq>` on the shared reference module. Issued per
  service line for CONFIRMED+ bookings with at least one traveller;
  everything printed is a **snapshot** (traveller names, supplier and
  confirmation number from the line's confirmation, travel dates, service
  text) so later edits never rewrite a voucher in a customer's hands —
  reissue instead. ISSUED/CANCELLED. `qrData` is a stable versioned payload
  (`TRAVELOS|V1|<vch>|<bk>|<conf#>`) rendered as a QR placeholder on the
  printable `/[tenantSlug]/vouchers/[voucherId]` page — swapping in a real
  QR renderer is a render-only change.

### Schema & wiring
Migration `20260712150000_add_agency_operations` (offline). Six new models +
five enums registered in `TENANT_SCOPED_MODELS`; `Booking` gains
`cancellationPolicyId` + travellers/cancellation/confirmations/vouchers
relations; `cancelBookingSchema` gains optional `supplierPenalty`/`notes`.
No new permission resources: travellers/confirmations/vouchers are booking
sub-resources (`booking:*`); policies ride `settings:*`.

### Tests & gates
22 new tests (passport checks incl. six-month rule against travel end vs
today; engine tier resolution, percentage/fixed penalties, caps, outstanding
penalty, cents-exactness, no-rule and no-date fallbacks; day math; voucher
reference + QR payload) — suite total **161 passing**. `npm run lint` clean,
`npx tsc --noEmit` clean, `npm run build` clean (voucher route compiles).

### Deferred (intentional)
Real QR rendering (payload is final; placeholder box today), voucher/invoice
PDF export, emailing vouchers/confirmation requests to suppliers, automatic
supplier-portal confirmations, per-line cancellation (the engine works at
booking level), and a reusable tenant-level traveller directory (today PAX
records are per-booking snapshots by design).

---

## 20. Engineering Governance — the Feature Pipeline (ADR, binding)

Adopted after M4 Sprint 4, at the product owner's direction. **From this
point on, no feature goes straight to implementation.** Every new feature
passes through this pipeline, in order, and production code is only written
after explicit human approval of the implementation plan.

| Phase | Gate | Output |
|---|---|---|
| 1. Business analysis | No assumptions — unknowns are questions back to the owner | Actors, workflows, revenue/money/data flow, failure & edge cases, legal + security implications |
| 2. Industry benchmark | Compare against leading platforms (Amadeus, Duffel, Hotelbeds, Booking.com, Expedia, TravelPerk, Navan, Sabre, Stripe, HubSpot, Salesforce — as applicable): workflow, architecture, strengths, weaknesses, tradeoffs | **Best practices** + **what TravelOS does differently** — never copied blindly |
| 3. Technical design | Every decision justified | Architecture, database, APIs, jobs/queues/events, permissions, security, caching, scaling, retries, audit, monitoring, cost, external dependencies |
| 4. Architecture review | ADR / Brain / roadmap compatibility, future scalability, multi-tenant correctness, reusability, security, maintainability. **If a better architecture exists: STOP and explain** | Go / no-go with reasoning |
| 5. Implementation plan | **STOP — wait for owner approval** | Execution plan, milestones, files affected, migrations, tests, rollout strategy |
| 6. Implementation | Only after approval | Code, following the plan |
| 7. Validation | All must pass | Unit + integration tests, typecheck, lint, build, security + performance validation |
| 8. Documentation | Automatic, same change set | Brain / PROJECT.md / ADRs / architecture / roadmap / engineering report updated |

Operating principles: optimize for enterprise quality, long-term
maintainability, security, scalability, business value, and technical
excellence — never for speed. Anything unclear stops the pipeline and goes
back to the owner as a question; business assumptions are never made
silently.

Historical note: M0–M4 Sprint 4 (§15–§19) predate this pipeline and were
delivered under the earlier "report, then build" model with per-sprint
owner approval. They are not retroactively re-reviewed; the pipeline applies
to everything after this section.

---

## 21. M5-INT — Real Supplier Integration (Development Mode)

Connects the platform's search → validate → book workflow to the **real**
Duffel and Hotelbeds APIs. Delivered under the Feature Pipeline (§20) as an
owner-directed mission with the phases compressed by explicit instruction;
the review confirmed the M3/M3.1 layer already implemented most of the
target architecture, so this sprint closed the workflow gaps rather than
rebuilding anything.

### Credential architecture (unchanged, verified)

The mission's core requirement was already the standing design (§15):
`resolveTenantCredentials` tries the tenant's own encrypted credentials
first, then — only in development — falls back to the platform environment
variables (`DUFFEL_TOKEN`, `HOTELBEDS_HOTEL_API_KEY/_SECRET/_ENVIRONMENT`
in `.env.local`, labelled `source: "environment"`). Tenant credentials
always override the fallback, so **moving to production requires zero code
changes** — each agency connects its own account in Settings → Integrations
and the fallback simply stops being consulted (or is disabled wholesale via
`ALLOW_ENV_FALLBACK`). No credential is hardcoded anywhere; clients are
constructed per request from resolved credentials only.

### What was added

**Richer supplier data (DTOs + mappers).** `HotelRateDto` now carries the
fields an agent needs before committing money: `rateType`
(`BOOKABLE`/`RECHECK`), `paymentType`, per-rate occupancy, cancellation
policies (deadline + penalty amount), tax total/inclusion, and allotment.
`FlightOfferDto` now carries the provider passenger ids (Duffel order
creation must reference them), tax amount, payment requirements
(`paymentRequiredBy`, `priceGuaranteeExpiresAt`) and fare conditions
(refund/change allowed + penalties). The Amadeus mapper fills the new
fields conservatively (nulls) — booking prep is a Duffel-only flow.

**Hotelbeds `checkrates` (`HotelbedsClient.checkRates`).** The mandatory
pre-booking revalidation: RECHECK rates have indicative search prices and
MUST be re-priced before booking; the rechecked rateKey supersedes the
searched one. Exposed as `checkHotelbedsRatesAction` — deliberately
uncached, unlike every other integration action, because its purpose is a
live confirmation.

**Booking-flow preparation (`booking-prep.action.ts`).** The bridge from
live supplier results into TravelOS's existing booking machinery:
`prepareFlightBookingAction` re-prices the offer via `GET /air/offers/:id`
(Duffel rejects expired offers here — exactly the guard needed), then
creates a draft Booking + FLIGHT line item through the existing
`createBookingAction`/`addBookingItemAction` (reference numbering, totals,
activity timeline, audit — all reused). `prepareHotelBookingAction` does
the same behind a live `checkrates` call. Both store the supplier key
(offer id / rechecked rateKey) as the line item's `referenceId` for the
future order-creation step, and never trust a client-submitted price — the
booked amount is always the server-side revalidated one.

**Explorer UX.** Both explorers gained per-result actions: **Validate
price/rate** (live re-price, swaps the fresh result into the list) and
**Create booking** (customer picker dialog → prepare action → redirect to
the draft booking). Hotel rates render with BOOKABLE/RECHECK badges,
board, cancellability, and low-allotment warnings. Buttons appear only for
roles with `booking:create`; customer options are fetched server-side.

**Validation harness (`scripts/validate-suppliers.mjs`).** A repeatable
no-mock check of the six real endpoints the workflow depends on (Duffel
health/offer-search/offer-refresh, Hotelbeds health/availability/
checkrates) using the same `.env.local` credential source as the app.
Secrets are never printed.

### No-mock policy

This sprint introduces **no mock data and no faked responses**. Every code
path calls the real supplier APIs through the existing monitored HTTP
client (retry, rate-limit, logging). The only test doubles in the repo
remain the pure mapper unit tests, which assert on wire-format *parsing* —
they fabricate provider payload shapes, not supplier responses served to
users.

### Environment caveat (recorded 2026-07-12)

The remote dev container's egress policy blocks `api.duffel.com` and
`api.test.hotelbeds.com` (proxy CONNECT → 403), so the live validation
harness could not complete *from this machine*. The harness is committed
and re-runnable (`node scripts/validate-suppliers.mjs`) once those hosts
are allowed; the credentials themselves were verified present and
well-formed. This is a network-policy limitation, not an architecture or
code gap.

### Extension points deliberately deferred

Actual order creation (Duffel `POST /air/orders`) and hotel booking
confirmation (Hotelbeds `POST /bookings`) — i.e. spending real money with
suppliers — are the next step after this workflow is validated end-to-end
against live APIs. The prepared draft bookings already carry everything
those calls need (supplier keys, passenger ids, validated prices).

---

## 22. Sprint X — External Operations Layer, Milestone 1: Outbound Email

Adopted under the TravelOS Engineering Constitution (a standing governance
document, not yet itself written into PROJECT.md as of this section —
see the session record). Sprint X's mandate: close the gap between an
internal-operations platform and a commercially deployable SaaS, scoped
strictly to capabilities that let TravelOS interact with the outside world
(suppliers, payment providers, email, document delivery, invitations,
webhooks, background jobs, external auth) — explicitly excluding AI and
customer portals.

### Phase 1–3 (analysis, not code)

A full repository audit found two external-facing capabilities already
production-grade — file storage (`StorageProvider` + UploadThing adapter)
and external auth (Auth.js v5 + Google OAuth) — and used their shape as the
template for everything built afterward. Every other external capability
(payment collection, email, PDF delivery, notifications, team invitations,
webhooks, background jobs, supplier order execution) was confirmed missing
or schema-only by direct inspection, not assumption.

A dependency graph ordered six milestones: **(1) Email delivery** — the
correct first node because it's a true leaf with the largest fan-out
(Invitations, Invoice/Payment/Cancellation notices, and Document Delivery
all consume it) — **(2) Team Invitations**, **(3) Document Delivery
(PDF)**, **(4) Webhook infrastructure + Payment Gateway (Stripe)**,
**(5) Background Jobs**, **(6) Supplier Order Execution (Duffel flights)**.
Supplier Order Execution is deliberately last: Duffel requires payment at
order time, so it depends on Payment Gateway, not the other way around.

### Milestone 1 — delivered

**New module: `src/shared/lib/email/`** — a provider-agnostic outbound
email capability, mirroring the existing `StorageProvider` pattern exactly:
an `EmailProvider` interface (`types.ts`), a fetch-based Resend adapter
(`resend-provider.ts` — raw REST calls, not the `resend` SDK, matching the
same choice already made for Duffel/Hotelbeds/Amadeus; no new npm
dependency), and a single entry point (`sendEmail()` in `index.ts`) that
every feature calls instead of importing a concrete provider. Deliberately
does **not** reuse `features/integrations/lib/http.ts` — that module is
integration-feature-scoped (per-tenant rate limiting tied to
`ProviderType`), and `shared/lib` must not depend on `features/*`.

`sendEmail()` never throws — it returns a typed `SendEmailResult`
(`ok: true` or `ok: false` with a reason: `not_configured` /
`no_recipient` / `provider_error`), the same non-throwing discipline as
`ActionResult`. With `RESEND_API_KEY`/`EMAIL_FROM` unset, it logs a
warning and reports `not_configured` — the identical graceful-absence
pattern already used when a supplier integration has no credentials.

**First real wiring:** `issueInvoiceAction` now sends an "invoice issued"
email (`templates/invoice-issued.ts`, a pure, unit-tested function) to the
customer on file, and records a new `EMAIL_SENT` `InvoiceActivity` entry
on success — reusing the existing invoice timeline rather than introducing
an email-log table. This is strictly best-effort: the email send happens
*after* the invoice's status update, activity, and audit all succeed, and
its outcome can never change the action's returned result. A new
`resendInvoiceEmailAction` (same `invoice:update` permission as issuing —
no new RBAC key) lets an agent manually retry, surfaced as an "Email
invoice to customer" button in `InvoiceStatusActions` for any non-draft,
non-void invoice.

**Schema:** one additive migration
(`20260712220000_add_invoice_email_activity`) — `ALTER TYPE
"InvoiceActivityType" ADD VALUE 'EMAIL_SENT'`, following the exact
enum-extension pattern already used for `DocumentCategory` in M4 Sprint 4.
No new table.

**Env:** `RESEND_API_KEY`, `EMAIL_FROM` — both optional, documented in
`.env.example`, unset in this development environment (no real send was
attempted or fabricated).

**Tests:** 7 new (`invoice-issued.test.ts`, `resend-provider.test.ts`) —
template rendering, HTML-escaping of user-controlled fields, and Resend
payload shaping. 174 total passing (was 167). tsc/lint/build all green.

**Explicitly not in scope for this milestone:** Team Invitations,
Document Delivery, Payment Gateway, Background Jobs, and Supplier Order
Execution remain as planned in Phases 1–3 above — none were started, per
the instruction to implement only the first milestone.

---

## 23. Sprint — Complete the Communication Capability

The successor to §22, delivered under the same Engineering Constitution and
Feature Pipeline. §22 shipped one email (invoice-issued) tightly coupled to
one feature; this sprint's mandate was explicit: build the *capability*
every future outbound message depends on, not another isolated feature.

### The finding that drove the design

§22's `InvoiceActivity.EMAIL_SENT` pattern — bolt a `*_SENT` enum value onto
the owning feature's own activity model — does not generalize. Replicating
it for Invitations (and, later, cancellation notices, payment receipts)
would mean N enum growths and N copies of the same send-then-record logic,
with no single place to answer "has this tenant's email been working."
That duplication, not a missing feature, was this sprint's real target.

### Architecture: `CommunicationMessage` + `sendCommunication()`

A new model, `CommunicationMessage` (`prisma/schema.prisma`), is the single
write-target for "was a message sent" across the whole platform —
polymorphic `ownerType`/`ownerId` ownership, mirroring `Document`'s already-
proven pattern rather than inventing a new one. Fields: `channel`
(`CommunicationChannel`, one value — `EMAIL` — today; extending to
SMS/WhatsApp/Push later is one `ALTER TYPE ADD VALUE` migration and a new
provider adapter, not a redesign), `recipient`, `subject`, `status`
(`SENT`/`FAILED`/`SKIPPED`), `failureReason`, `providerMessageId` (Resend's
own message id, captured now as the hook a future delivery-status webhook
would correlate against — that webhook is not built), `sentByUserId`.

`src/shared/lib/communications/` is the new orchestration layer:
`sendCommunication(db, input)` calls the existing, unchanged `sendEmail()`
(still a pure, tenant-unaware, channel-only concern) and writes exactly one
`CommunicationMessage` row regardless of outcome — the same relationship
`runIntegrationCall` has to `providerRequest` for supplier integrations: a
tenant-aware wrapper around a pure I/O call, not a rewrite of either.
Feature-level timelines are NOT replaced — `InvoiceActivity.EMAIL_SENT`
still gets written, because "what happened to this invoice" (business
narrative) and "did this tenant's communications system work" (operational
record) are different, complementary questions. `issueInvoiceAction` was
refactored to call `sendCommunication()` instead of `sendEmail()` directly
— the concrete proof this generalizes, and the regression-test anchor for
Phase 5 (all pre-existing invoice tests pass unchanged).

A genuine cross-feature duplication was caught and fixed during
implementation, not after: both the invoice and invitation "resend" actions
need to turn a `SendCommunicationResult` failure reason into a message an
agent can read. Factored once — `src/shared/lib/communications/describe-
failure.ts` — and both actions use it; each keeps only its own
domain-specific reasons (e.g. invoice's "no email on file") local.

**Deliberately not built** (see PROJECT.md's own "do not overengineer"
discipline, applied): SMS/WhatsApp/Push adapters (no code path, channel
enum has one value), a template registry (two pure-function templates
don't justify one), an event bus (two call sites don't justify one),
automated retry (needs the not-yet-built Background Jobs milestone),
staff/member notification preferences (an invitation is a one-time
transactional message, not a tunable notification).

### Team Invitations — the capability's first real consumer

`Invitation` needed no schema changes — every field (`token`, `expiresAt`,
`acceptedAt`, `email`, `role`) already existed, unused, since M0. Built:

- `src/features/tenants/lib/invitation-token.ts` — `generateInvitationToken()`
  (`crypto.randomBytes(32)`, base64url; deliberately not the row's `cuid()`
  id — a bearer secret and a row identifier must never be the same value),
  `invitationExpiryDate()` (7 days), `isInvitationExpired()`.
- `checkInvitationRateLimit()` in `shared/lib/rate-limit.ts` (20/tenant/hour)
  — reuses the existing generic `check()` primitive already backing sign-in/
  sign-up rate limits; guards the invite action from becoming a spam vector
  against arbitrary addresses.
- `src/features/tenants/actions/invitation.action.ts` —
  `createInvitationAction` (RBAC: `invitation:create`, OWNER/ADMIN only;
  upserts on the existing `[tenantId, email]` unique constraint so
  re-inviting a still-pending or previously-removed person reissues rather
  than errors; always succeeds once the row exists, email delivery is
  best-effort and reported separately — same discipline as invoice
  issuance), `resendInvitationAction` (regenerates token+expiry; unlike
  create, its whole purpose IS the email, so a failed send fails the
  action — mirrors `resendInvoiceEmailAction` exactly), `revokeInvitationAction`
  (hard-delete; an unaccepted invitation isn't a financial record worth
  soft-deleting), `acceptInvitationAction` (session-only, not
  `requirePermission` — the invited person has no membership yet, which is
  exactly the state this resolves; looks up by token via the raw `prisma`
  client since there is no tenant to scope by until the token is verified;
  creates/reactivates `Membership` + marks accepted + audits in one
  transaction). **OWNER is deliberately not an invitable role** — granting
  it through an invite form would let any ADMIN (who also holds
  `invitation:create`) mint a new OWNER, an unintended privilege escalation
  the schema's flat RBAC grant didn't anticipate; `INVITABLE_ROLES` excludes
  it.
- Invitation lifecycle (create/resend/revoke/accept) writes to the
  existing, reused `AuditLog` via `writeAudit()` — no new
  `InvitationActivity` model, matching the audit's finding that none
  should be added.
- UI: `InviteMemberForm` + `PendingInvitationsList` added to the existing
  Team settings tab (`MemberList` untouched); `/invite/[token]` — a new
  route rendering one of five states (invalid / already-accepted / expired
  / signed-in-with-matching-email / signed-in-with-wrong-email), or, when
  signed out, the **existing** `SignInForm`/`SignUpForm` components reused
  in place via one new optional `redirectTo` prop on each (default
  `/onboarding`, preserving current behavior exactly — both existing call
  sites are untouched) rather than duplicated auth UI.

### A middleware gap caught during self-review, not after

`/invite/[token]` must be reachable signed OUT (it renders sign-in/sign-up
inline) — but `auth.config.ts`'s `authorized()` callback only allow-listed
three *exact* paths (`/`, `/sign-in`, `/sign-up`), so an unauthenticated
visit would have been redirected away before the page ever rendered,
silently breaking the entire flow for anyone without an existing session —
precisely the audience invitations exist to onboard. Fixed with a new
`PUBLIC_ROUTE_PREFIXES` list (`/invite/`) alongside the exact-match list,
and pinned down with a dedicated test (`auth.config.test.ts`) covering the
exact-match routes, the new prefix, a deliberate near-miss
(`/invited-elsewhere` must NOT match), and the authenticated case.

### Also caught in self-review: over-broad action visibility

`PendingInvitationsList`'s resend/revoke buttons were initially rendered
for every role with `invitation:view` (i.e. everyone), even though only
OWNER/ADMIN hold `invitation:update`/`delete` — a READ_ONLY or AGENT member
would have seen live buttons that crash on click. Fixed by gating the
buttons on a `canManage` prop, matching the established pattern (e.g.
`InvoiceStatusActions`'s `canEdit`/`canManage` booleans) instead of relying
on the server-side check alone to fail silently-ugly.

### Tests, gates

11 new test files' worth of additions across this sprint's files (token
generation/expiry, both new templates' rendering/escaping, the
middleware's `authorized` callback). 186 total passing (was 174). tsc,
lint, and production build all green, including the new `/invite/[token]`
route in the build output.

### Remaining communication gaps (named, not silent)

SMS/WhatsApp/Push, a delivery-status webhook receiver (Resend →
`CommunicationMessage.status` reconciliation), automated retry
(Background Jobs milestone), a template registry, in-app notifications,
staff notification preferences, role-change/remove-member UI for existing
members (adjacent to invitations but not a communication concern).

### Recommendation for the next sprint

Return to the Sprint X roadmap (§22): **Document Delivery (PDF)** next —
smallest remaining unit, pairs directly with what this sprint built (an
emailed PDF invoice/voucher attachment), and has zero dependency on the
larger, higher-risk Payment Gateway / Webhook Infrastructure milestone
that should follow it.

---

## 24. Sprint — Supplier Order Execution Capability

The largest remaining gap identified across every prior audit this
session: bookings validated a real supplier price (M5-INT) but never
became a real supplier order. This sprint closes it with a generic
execution engine — Duffel is the first of what should be several provider
implementations, not the architecture itself.

### The money question, addressed directly

This is the first capability in TravelOS that can move real money without
a payment gateway existing: Duffel supports paying via a **pre-funded
account balance** the agency tops up directly through Duffel's own
dashboard, entirely outside TravelOS — no card processing required from
this platform. The engine defaults to Duffel's **HOLD** order type
whenever an offer supports it (`FlightOfferDto.paymentRequiredBy`,
captured unused since M5-INT specifically for this step) — reserving the
fare with **no money moving** — and only falls back to an instant,
balance-debiting purchase when an offer requires it. Separately, executing
against a booking whose invoices aren't fully settled requires an
explicit, audited manager override (`booking:manage`, not just `update`)
— real agencies sell on deposit, so this is a soft precondition an
owner/admin can consciously bypass, never a silent one an agent can trip.

### Architecture: generic engine, Duffel as first implementation

`SupplierExecutionProvider` (`src/features/supplier-execution/lib/types.ts`)
is the interface the engine depends on — `execute()`, `cancel()`, and a
declared-but-undimplemented `modify()`. `src/features/supplier-execution/
providers/duffel/duffel-execution-provider.ts` is the only concrete
implementation; a Hotelbeds or Amadeus adapter is a new file implementing
the same interface, not a change to the engine, the schema, or any call
site — the literal requirement ("Duffel must become one implementation of
this architecture — not the architecture itself") satisfied structurally.

Two new models, mirroring the `Payment`/`PaymentTransaction` and
`Invoice`/`InvoiceActivity` relationship already proven in this schema:
`SupplierOrder` (current state, 1:1 with `BookingItem` — the same shape
`SupplierConfirmation` already has) and `SupplierOrderEvent` (append-only
attempt/transition log). On success, the engine **updates the existing**
`SupplierConfirmation` row (real `confirmationNumber`) rather than
duplicating it — an agent sees the same confirmation UI they already use
for manual entries, now sometimes populated by the machine.

### Idempotency — what's actually guaranteed

Duffel's own idempotency support isn't verifiable from this environment
(network to `api.duffel.com` is blocked here — see M5-INT). What the
engine guarantees unconditionally is at TravelOS's own layer: claiming the
right to execute is an atomic `updateMany` (`WHERE status IN (PENDING,
SUPPLIER_FAILED)` → `EXECUTING`) — Postgres serializes concurrent UPDATEs
on the same row, so only one of two simultaneous requests ever reaches the
supplier call. A separate, real race was caught and fixed in Phase 6
self-review: the very *first* execution request for a line (before any
`SupplierOrder` row exists) raced on `create()`'s unique constraint — a
double-click threw an unhandled error for the loser rather than a clean
message. Fixed by catching the `P2002` and joining the winner's row; this
was never a double-purchase risk (the loser never reached the claim), just
an unhandled-error robustness gap.

### Lifecycle

`PENDING → EXECUTING → SUPPLIER_CONFIRMED [→ AWAITING_PAYMENT →
SUPPLIER_CONFIRMED] → CANCELLED`, with `SUPPLIER_FAILED` (retry-gated by a
classified `retryable` flag) and a terminal-but-recoverable
`RECONCILIATION_REQUIRED` for the one failure mode that matters most: the
supplier call succeeded but TravelOS's own write of that success failed.
This state is never auto-retried — retrying a possibly-already-successful
purchase risks a second real order — and is logged at `error` level before
any recovery write is attempted, so even a total persistence failure
leaves a trail. Full transition table and reasoning: `lib/status.ts`.

### Two more gaps caught in Phase 6 self-review, not after

- `removeBookingItemAction` would have silently cascade-deleted a
  `SupplierOrder` — including one holding a real, already-purchased
  flight — along with its line item, with no record left that a real
  order ever existed. Fixed: removing a line with an active/confirmed
  supplier order is now blocked until the order is explicitly cancelled.
- `updateBookingItemAction` would have let an agent edit the price/
  description of a line after its supplier order was placed, silently
  drifting the booking's own numbers away from what was actually
  purchased. Fixed: editing is blocked once a line's order is anything
  but `PENDING`/`SUPPLIER_FAILED`/`CANCELLED`.

### Files, database, APIs

New: `src/features/supplier-execution/{lib,providers/duffel,actions,
queries,components,schemas}` (engine, Duffel adapter, actions, UI). New
`DuffelClient.createOrder`/`cancelOrder` methods and `CreateOrderInput`/
`FlightOrderDto` DTOs — extending the existing client rather than a
parallel HTTP path, matching every other Duffel call in the codebase.
Two new tables (`supplier_orders`, `supplier_order_events`), four new
enums, no changes to any other model's shape (only new relation fields).
New actions: `requestExecutionAction`, `retryExecutionAction`,
`cancelExecutionAction` — all `booking:update`/`manage`, no new
permission key. Modified: `removeBookingItemAction`,
`updateBookingItemAction` (the two guards above).

### Tests, gates

27 new tests (lifecycle transitions, error classification, idempotency-key
determinism, Duffel order-payload/response mapping — all pure-logic, the
same discipline as every prior supplier-integration test in this
codebase; the engine's DB-touching orchestration itself is untested
directly, consistent with `sendCommunication`/`issueInvoiceAction` etc.).
207 total passing (was 186). tsc, lint, and production build all green.

### Remaining supplier capabilities (named, not silent)

Automated retry (needs Background Jobs — still correctly sequenced after
this, unchanged from the Sprint X roadmap); "pay for a HOLD order" (the
order can be created but not yet paid through TravelOS); Hotelbeds/Amadeus
execution adapters (the architecture supports them; no adapter written);
fare modification (`modify()` declared, not implemented — a real feature
in its own right); a delivery-status webhook for order-cancellation
confirmations from Duffel's side.

### Production readiness assessment

The engine's safety properties (claim-based concurrency, fail-loud
reconciliation, audited overrides, booking-consistency guards) are real
and tested wherever testable without live network access. What is
**not** verifiable from this environment, and must be confirmed before
this is trusted with a real agency's Duffel balance: an actual live call
to `POST /air/orders` against Duffel's sandbox, exercising the full
create → confirm → cancel path end to end. `scripts/validate-suppliers.mjs`
(M5-INT) is the harness to extend for this once network egress allows it.

## 25. Sprint — Commercial SaaS Capability

Every prior sprint made TravelOS more capable as a product; none made it
sellable. `Tenant.plan`/`Tenant.status` had existed since M0 as unread,
unwritten placeholder columns. This sprint builds the commercial platform
those columns were always meant to summarize — plans, subscriptions,
billing identity, entitlements, and a provider-agnostic billing interface
— explicitly stopping short of Stripe. As stated at the start: "Stripe is
an implementation detail, not the architecture."

### Architecture: catalog, lifecycle detail, fast projection

Four new models. `Plan` is a platform-owned catalog (not tenant-scoped —
like a price list), seeded via migration data with four rows (trial,
starter, professional, enterprise) so it exists the moment the migration
runs. `Subscription` (1:1 with `Tenant`) is the detailed lifecycle record
— status, trial/grace-period/period-end dates. `BillingAccount` (1:1,
mostly unused this sprint) is the provider-agnostic billing identity a
future Stripe customer ID would live on. `SubscriptionEvent` is the
append-only log — the same shape as `PaymentTransaction`, `InvoiceActivity`,
and `SupplierOrderEvent` already proven in this schema.

`Tenant.plan`/`Tenant.status` are kept in sync by every `Subscription`
write (`applyPlanAndStatus`, the one function that ever writes them) —
the same "fast summary + detailed record" split used everywhere else this
session, not a new pattern, and finally a real consumer of those M0
placeholder columns instead of a second copy of the same state.

### Provider abstraction — proven by a real, non-Stripe implementation

`BillingProvider` (`activateSubscription`, `changePlan`,
`cancelSubscription`) is the interface the action layer calls through.
`ManualBillingProvider` is the first real implementation — no payment
collection, an OWNER-triggered, fully audited plan activation for trials,
comped/negotiated deals, and dogfooding. It proves the interface the same
way `DuffelExecutionProvider` proved `SupplierExecutionProvider`: a
second, low-risk implementation before the highest-risk one.
`StripeBillingProvider` is declared as the extension point, not built.

### Lifecycle and the "never a background job" pattern, again

`TRIALING → ACTIVE → PAST_DUE → SUSPENDED → CANCELLED` (terminal), with a
lapsed trial (`EXPIRED`) able to convert directly to `ACTIVE` later.
`effectiveStatus()` derives the real current state from stored dates
(`trialEndsAt`, `gracePeriodEndsAt`) at check-time — the same discipline
`isOverdue()` established for invoices — so a lapsed trial reads as
expired immediately, with no cron required. `PAST_DUE` and the
failed-renewal event that produces it are modeled in the state machine but
have no live trigger yet: exactly how `AWAITING_PAYMENT` existed in the
Supplier Execution lifecycle before a "pay for a hold order" call was
built.

### Entitlements — seats, wired into a real caller

`hasFeature(plan, key)` and `checkSeatLimit(db, tenantId)` are pure/near-
pure functions any future feature gate calls. This sprint wires one real
consumer, not a demonstration: `createInvitationAction` now checks the
tenant's seat limit (active members + pending, unexpired invitations)
before creating an invitation, with a specific correctness fix for
re-invites — an already-pending email doesn't consume a second seat, so
the check only runs when the invitation would actually be new.

### Downgrade safety — explicit, audited override

Upgrading is always allowed. Downgrading to a plan whose seat limit is
below current usage is blocked unless the caller explicitly acknowledges
it (`acknowledgeSeatOverage`) — the same explicit-override shape already
used twice this session (invoice void requiring a refund first;
`SupplierOrder`'s `paidOverride`). Since `billing:manage` is already
OWNER-exclusive, the override here isn't a second permission tier — it's
an explicit confirmation, computed client-side from data already in hand
and confirmed once before a single server call, not inferred by parsing a
server error string.

### One bug caught in Phase 6 self-review, not after

`changeSubscriptionPlanAction` moved a subscription to `ACTIVE` but only
cleared `trialEndsAt`/`gracePeriodEndsAt` in `activateSubscriptionAction`,
not here — a plan change out of `TRIALING` or `PAST_DUE` would have left a
stale trial or grace-period date sitting on an otherwise-ACTIVE
subscription. Harmless to `effectiveStatus()` today (it only reads those
dates when `status` is `TRIALING`/`PAST_DUE`), but exactly the kind of
drift this session's self-review discipline exists to catch before it
becomes a real bug later. Fixed: both paths to `ACTIVE` now clear both
dates identically.

### OWNER-exclusive billing, same pattern as OWNER-exclusive invites

A new `"billing"` resource. OWNER alone holds
`billing:create/update/delete/manage`; every other role — including
ADMIN — holds only `billing:view`. Mirrors "OWNER is deliberately not an
invitable role" from the Communication Capability sprint: the same
owner-exclusive decision category, applied to the tenant's commercial
relationship with the platform instead of its membership roster.

### Files, database, APIs

New: `src/features/billing/{lib,providers/manual,actions,queries,
components,schemas}` (lifecycle rules, entitlements, `BillingProvider` +
`ManualBillingProvider`, three actions, summary query, Settings UI panel).
Four new tables (`plans`, `subscriptions`, `billing_accounts`,
`subscription_events`), four new enums, one seed-data insert (four plan
rows) in the migration itself. Modified: `createTenantAction` (starts a
14-day trial `Subscription` in the same transaction as the tenant and its
founding membership — atomic, no orphaned tenant without a subscription);
`createInvitationAction` (seat-limit check); `permissions.ts` (`billing`
resource); `settings-tabs.tsx`/`settings/page.tsx` (new Billing tab).

### Tests, gates

25 new tests (subscription transition rules, trial/grace-period expiry,
`effectiveStatus` derivation, plan-code mapping, period-end math, feature/
seat entitlement checks — all pure-logic, the same discipline as every
prior domain-lib test this session). 232 total passing (was 207). tsc,
lint, and production build all green.

### Remaining commercial capabilities (named, not silent)

`StripeBillingProvider` and any checkout/webhook flow (the actual revenue
mechanism); renewal/dunning automation (needs Background Jobs, still
correctly sequenced after this); usage-limit counters beyond seats (the
`limits` JSON field supports them, nothing populates a second key yet);
tax handling (a genuine legal gap once real charges exist, largely solved
by Stripe Tax once Stripe is integrated); terms-of-service acceptance
tracking; a platform admin view across tenants' subscriptions (needs the
not-yet-built admin panel).

### A known gap: pre-existing tenants have no `Subscription`

This migration seeds the `Plan` catalog but does not backfill a
`Subscription` row for tenants created before this sprint shipped — trial
auto-start only runs inside `createTenantAction` going forward. Such a
tenant's Settings Billing tab shows "no subscription found" rather than
crashing, and `checkSeatLimit` fails open (unlimited) rather than closed
for it, so this is a visible gap, not a silent one — a one-time backfill
script (create a `Subscription` per existing `Tenant`, matching its
current `Tenant.plan`) is real, scoped work for whoever ships this to a
database with pre-existing tenants, not attempted here since none exist
in this environment.

### Production readiness assessment

The lifecycle, entitlement, and override logic are real and fully tested
— no live external dependency exists for this sprint's actual scope
(`ManualBillingProvider` makes no network calls), so there is no
"can't verify from this environment" gap the way Supplier Execution and
M5-INT have with live Duffel/Hotelbeds calls. What is **not** production-
ready is what was deliberately not built: there is still no way to
actually charge a travel agency's credit card. TravelOS can now describe,
enforce, and audit a commercial relationship with a tenant — it cannot
yet collect money for one. That is the next commercial sprint's mission,
not this one's.

## 26. Sprint — Platform Automation Capability

Every prior sprint that touched something asynchronous (outbound email,
supplier execution, subscription lifecycle) reached the same documented
conclusion: no background job infrastructure exists, so the operation runs
synchronously inline, or — worse — fire-and-forget with a `.catch()` that
just logs a warning and drops the failure. This sprint ends that pattern:
one reusable job engine every future asynchronous capability (Stripe,
Hotelbeds, additional Duffel workflows, scheduled reporting, incoming
webhooks) dispatches through, built without touching any of those
providers.

### Repository audit (Phase 1) — what already existed

| Concern | State | Evidence |
|---|---|---|
| Queue / worker process | 🔴 Confirmed absent | Zero hits for a queue library (`bullmq`, `bee-queue`, `agenda`) or `node-cron` in `package.json`. No `packages/`/`apps/` worker process in this repo. |
| Retry logic | 🟡 Exists, but per-request only | `providerRequest()` (`features/integrations/lib/http.ts`) retries a single HTTP call within one request's lifetime with exponential backoff + jitter (`backoffDelayMs`) and honours `Retry-After`. `classifyExecutionFailure` (Supplier Execution) separately classifies retryable vs. terminal failures. Neither survives past the request — there is no "try again in an hour." |
| Event/audit logging | ✅ Exists, directly reusable pattern | The "fast state + append-only log" pair used four times already (`Payment`/`PaymentTransaction`, `Invoice`/`InvoiceActivity`, `SupplierOrder`/`SupplierOrderEvent`, `Subscription`/`SubscriptionEvent`) is the exact shape a job queue needs (`Job`/`JobEvent`) — not a new pattern. |
| Fire-and-forget async today | 🟡 One real instance, silently lossy | The Supplier Execution confirmation email (`execution.action.ts::onExecutionOutcome`) sends inline and only logs a warning on failure — a transient email-provider blip today permanently loses a customer notification with no record it was ever attempted. |
| Structured logging | ✅ Exists, reusable as-is | `shared/lib/logger.ts` — NDJSON, level-gated, `.child()` for bound context. Used unchanged by the new engine. |
| Idempotency precedent | ✅ Exists, directly reusable pattern | `SupplierOrder.idempotencyKey` (unique + P2002-race-handled create) is the exact shape a job queue's dedupe key needs. |
| Deployment target | 🟡 Inferred, not declared | No `apps`/worker process, no Dockerfile for this app, `next build`/`next start` scripts, Next.js + Auth.js + UploadThing stack — consistent with Vercel, never explicitly declared. The engine and trigger route are written to that assumption (see "Deployment assumption" below), not hard-coded to it. |

### Architecture (Phase 2) — a table is the queue

No external queue, no Redis, no second process. `jobs` (Postgres) **is**
the queue; this sprint's `runWorker()` **is** the worker — both exist
only as code paths invoked by an HTTP request, since nothing in this
deployment target runs continuously. Every architectural requirement below
is satisfied by that one decision, not by six separate subsystems:

- **Background job / queue / worker abstraction**: `Job` (state) +
  `JobEvent` (log) + `enqueueJob()`/`runWorker()`
  (`features/automation/lib/engine.ts`).
- **Retry policy**: exponential backoff with jitter, reusing
  `backoffDelayMs` — newly extracted to `shared/lib/backoff.ts` so the
  integrations HTTP client and the job engine share one formula instead of
  two (a real, small refactor, not a new capability).
- **Dead-letter strategy**: `DEAD_LETTER` status once `attempts >=
  maxAttempts` (or a failure is classified non-retryable) — never
  auto-requeued, the same fail-loud precedent as `RECONCILIATION_REQUIRED`.
- **Idempotency**: an optional caller-supplied `idempotencyKey`
  (unique, P2002-race-handled — the exact pattern `SupplierOrder`
  established).
- **Distributed locking**: deliberately not built as a separate
  mechanism. The atomic single-row `updateMany` claim (`WHERE id = ? AND
  status = 'PENDING'` → `RUNNING`) *is* the lock — Postgres serializes
  concurrent UPDATEs on the same row, so two overlapping worker ticks can
  never both claim one job. Same conclusion Supplier Order Execution's
  engine reached about its own claim.
- **Scheduling**: `availableAt` — a job isn't claimable until reached.
  Both the initial enqueue delay and where a retry's backoff lands use the
  same field; no second "scheduled jobs" table.
- **Event dispatching**: a job's `type` string *is* the event name,
  routed to exactly one registered handler (`features/automation/lib/
  registry.ts`) — this sprint deliberately unifies "background job" and
  "event dispatch" into one mechanism rather than building two.
- **Webhook processing**: not built (no webhook source exists yet — see
  gap analysis), but the pattern is now structurally supported: a future
  webhook route verifies the signature synchronously, then
  `enqueueJob()`s the actual processing.
- **Execution history / observability**: `JobEvent` per job, `logger`
  structured entries per transition (`ENQUEUED → CLAIMED → SUCCEEDED` /
  `RETRY_SCHEDULED`* / `DEAD_LETTERED`).
- **Failure recovery**: retryable failures reschedule automatically;
  non-retryable and exhausted-retry failures dead-letter and require a
  human, never silently vanish (the Supplier Execution confirmation
  email's old behavior).
- **Cancellation**: `cancelJob()` — a `PENDING` job can be cancelled
  before it's claimed. No UI calls it yet (no consumer needed one this
  milestone); the capability exists.
- **Priority handling**: `Job.priority` (default 0, higher runs first)
  — an `ORDER BY priority DESC` on candidate selection, not a separate
  priority queue implementation.
- **Scalability**: the worker is stateless — every property that
  matters comes from the atomic claim, not from anything held in memory,
  so running the trigger route concurrently (overlapping cron ticks, a
  manual trigger racing the schedule) is safe without coordination.

### Provider abstraction, generalized

`JobHandler` (`type`, `handle(payload, context)`) is this sprint's version
of the "interface + first real implementation" pattern used for every
external capability so far (`EmailProvider`→`ResendEmailProvider`;
`SupplierExecutionProvider`→`DuffelExecutionProvider`;
`BillingProvider`→`ManualBillingProvider`) — except here the "provider" is
whichever asynchronous capability owns a job `type`. A payload is
`unknown` at the interface boundary and validated with Zod inside each
handler (`send-communication.handler.ts`'s `payloadSchema`), not trusted
via a generic cast — the same DTO-boundary discipline as everywhere else,
applied to data that round-trips through a JSONB column instead of an
HTTP response.

### Deployment assumption, named explicitly

The trigger route (`GET /api/jobs/process`) and `vercel.json`'s `crons`
entry assume deployment on Vercel — inferred from the stack (Next.js,
Auth.js, UploadThing, `server-only`), never confirmed, and the only place
in this sprint that assumes a specific host. The route itself doesn't:
it's a plain authenticated HTTP handler any external scheduler can call.
If deployed elsewhere, replace `vercel.json` with that platform's
scheduled-task mechanism pointed at the same route — no application code
changes. `CRON_SECRET` (not a bespoke name) matches Vercel's own
documented convention: when set, Vercel Cron sends it automatically as
`Authorization: Bearer $CRON_SECRET`. The route fails closed (503) if
unset, and Vercel Cron's minimum practical frequency depends on the
account's plan tier (Hobby is limited to once/day) — `*/5 * * * *` in
`vercel.json` is the intent, not a guarantee on every tier.

### Gap analysis (Phase 3)

| Gap | Business value | Dependencies | Risk | Priority | Reusable |
|---|---|---|---|---|---|
| Core job engine (queue table, claim, retry, dead-letter) | Nothing else here is buildable without it | None | Low | **Highest — this sprint** | `SupplierOrder`'s claim/idempotency pattern |
| A trigger mechanism (something must call the worker) | Without this, jobs enqueue and never run | Job engine | Low | **This sprint** | — |
| One real handler, proving the platform | A demonstration with no caller doesn't prove anything | Job engine | Low | **This sprint** | `sendCommunication()` |
| Stripe/Hotelbeds/webhook handlers | The actual future consumers named in the mission | Job engine (this sprint) | Varies per provider | Explicitly excluded this sprint | `JobHandler` interface |
| Migrating every existing `sendCommunication()` call site (invoices, invitations) onto jobs | Consistency, durability everywhere | Job engine (this sprint) | Low, but changes response-time behavior of transactional flows | Next automation sprint | `send-communication.handler.ts` |
| Real distributed job monitoring UI | Ops visibility across tenants | Job engine (this sprint) + admin panel (still not built, named in every prior sprint) | Low | Separate sprint | `JobEvent` |
| Scheduled/recurring jobs (not just delayed) | Nightly reports, cleanup tasks | Job engine (this sprint) | Low | Next automation sprint | `availableAt` |
| Handler-level metrics (success rate, latency) | Operational insight | Job engine (this sprint) | Low | Later | `JobEvent` |

### One bug caught in Phase 6 self-review, not after

`process()` scheduled a retryable failure's next attempt with
`nextAvailableAt(job.attempts)`, where `job.attempts` is already the
post-increment count (1 after the first attempt). That made the *first*
retry wait ~60s instead of the documented ~30s, and every subsequent
retry one step further out than intended — not a correctness bug (still
monotonically increasing, still capped, no double-processing), but a real
drift between the documented backoff schedule and the actual one. Fixed:
the call site now passes `job.attempts - 1`, with `nextAvailableAt`'s doc
comment tightened to state its zero-indexing explicitly so the same
off-by-one can't recur at a different call site later.

### Files, database, APIs

New: `src/features/automation/{lib,handlers}` (types, registry, retry,
engine, the `SEND_COMMUNICATION` handler + its registration file).
`src/shared/lib/backoff.ts` (extracted from `integrations/lib/http.ts`,
which now imports it instead of duplicating the formula — `cache.test.ts`
lost its `backoffDelayMs` test, moved to the new `backoff.test.ts`
alongside the extracted module). Two new tables (`jobs`, `job_events`),
two new enums. New route: `GET /api/jobs/process` (secret-protected, not
RBAC — see "Deployment assumption"). New `vercel.json`. New env var
`CRON_SECRET` (optional; route fails closed without it). Modified:
`execution.action.ts` (the supplier-order confirmation email now enqueues
a `SEND_COMMUNICATION` job instead of sending inline with a `.catch()`
that dropped failures); `db.ts` (`Job`/`JobEvent` added to
`TENANT_SCOPED_MODELS`).

### Tests, gates

7 new tests (`backoffDelayMs`'s custom-base case, `nextAvailableAt`'s
growth/cap behavior — both pure). The engine's own DB-touching
orchestration (`enqueueJob`/`claim`/`runWorker`) is untested directly,
consistent with every prior sprint's engine (`sendCommunication`,
`claimAndExecute`) — instead verified at runtime: the trigger route was
started with `next dev` and exercised end-to-end for its three reachable
outcomes without a live database — no `CRON_SECRET` (503), wrong secret
(401, twice), correct secret (reaches `runWorker()`, which then correctly
fails only on this sandbox's unreachable Postgres, confirmed from the
dev-server log rather than assumed). 235 total tests passing (was 232, the
234th and 235th are the two `backoff.test.ts` cases; the pre-existing
`backoffDelayMs` test moved rather than being duplicated). tsc, lint, and
production build all green.

### Remaining automation capabilities (named, not silent)

Every provider named in the mission (`StripeBillingProvider`,
`DuffelExecutionProvider` migrating fully onto jobs, a Hotelbeds
`JobHandler`, an incoming-webhook receiver) — none built, all structurally
supported by `JobHandler` without engine changes. Migrating the
`issueInvoiceAction`/`createInvitationAction` email sends onto jobs (only
the Supplier Execution confirmation email was migrated this sprint, as the
one real, lowest-risk proof — those two remain synchronous, unchanged, on
purpose). True recurring/scheduled jobs (cron-shaped, not just delayed-
once) — `availableAt` supports "run no earlier than X" but nothing
re-enqueues itself periodically yet. A job monitoring UI (`JobEvent` exists
for one to query; none built, same "no admin panel yet" gap named every
prior sprint). Handler-level metrics beyond the per-job event log.

### Production readiness assessment

The claim, retry, and dead-letter logic reuses concurrency and idempotency
guarantees already proven correct in Supplier Order Execution, and the
trigger route's auth/fail-closed behavior was verified end-to-end against
a running dev server, not just typechecked. What is **not** verifiable
from this environment is the one thing that matters most before trusting
this in production: an actual live tick against a reachable Postgres
database, run repeatedly, watching a real job move `PENDING → RUNNING →
SUCCEEDED` and a deliberately-failing one move through `RETRY_SCHEDULED`
into `DEAD_LETTER` — this sandbox's Postgres is unreachable (`P1001`), the
same limitation M5-INT's live-API validation has had all session. The
deployment-target assumption (Vercel) is also unconfirmed and named
explicitly rather than silently baked in. Everything else — the schema,
the engine's logic, the trigger route's security, the one real handler —
is production-shaped and ready for that live verification pass.

## 27. Sprint — Public Website & Verification Readiness

Every prior sprint built the product; nothing built the public-facing
surface a real customer — or a payment provider's verification reviewer —
would see before ever signing in. This sprint builds that surface: a
marketing site, four legal pages, and the SEO/metadata plumbing a
verification pass actually checks. No payment provider is integrated.

### Repository audit (Phase 1) — what already existed

| Area | State | Evidence |
|---|---|---|
| Marketing site | 🔴 One placeholder page | `(marketing)/page.tsx` — a title, one line of copy, two buttons. No nav, no footer, no other pages. |
| Legal pages | 🔴 Confirmed absent | No `/terms`, `/privacy`, `/refund-policy`, `/cookie-policy`, or equivalent anywhere in `src/app`. |
| SEO configuration | 🔴 Confirmed absent | No `robots.ts`, `sitemap.ts`, `icon.tsx`, or `opengraph-image.tsx`. Root `layout.tsx` had a flat two-line `metadata` object — no `metadataBase`, no Open Graph, no Twitter card, no canonical URLs. |
| Public assets | 🔴 Confirmed absent | `public/` was empty. `favicon.ico` present but is the stock `create-next-app` default, not a TravelOS mark. |
| Contact/company info | 🔴 Confirmed absent | No support email, company name, address, or social links anywhere — not in code, not in `env.ts`. |
| Reusable data for a real pricing page | ✅ Exists, directly reusable | `Plan` (Commercial SaaS Capability) is a real, seeded, non-tenant-scoped catalog — the public Pricing page queries it directly rather than hardcoding numbers a second time. |
| Auth middleware's public-route list | 🟡 Existed, incomplete for this sprint's needs | `PUBLIC_ROUTES`/`PUBLIC_ROUTE_PREFIXES` (`auth.config.ts`) already existed (Communication Capability sprint, for `/invite/[token]`) — this sprint had to extend it substantially; see the bug below. |

### Public website (Phase 2)

Six pages under `(marketing)`: Home, Features, Solutions, Pricing, About,
Contact — sharing one `MarketingLayout` (nav + footer) and a reusable
`PageHero` component so every page's header is visually consistent without
duplicating markup. Copy is grounded in what the product actually does
(bookings, quotes, invoicing, live Duffel/Hotelbeds search, CRM, RBAC,
multi-tenancy, the automation engine) — sourced from a single
`FEATURES` list (`features-content.ts`) the Home page's highlight grid and
the full Features page both render from, not two independently maintained
copies.

**Pricing is the one page that reads from the database** rather than
hardcoded marketing copy — it queries the real `Plan` catalog (seeded by
the Commercial SaaS Capability sprint) so a price or plan change is never
out of sync between what Settings shows an existing customer and what the
public site advertises. Marked `export const dynamic = "force-dynamic"`
so it always reflects current rows rather than a build-time snapshot.

### Legal pages (Phase 3)

Terms of Service, Privacy Policy, Refund & Cancellation Policy, and Cookie
Policy — each a real, complete draft (not lorem ipsum, not a "coming
soon"), built on one shared `LegalDocument` component so updating a policy
later means editing that page's `sections` array, never touching layout
markup. Company identity facts (legal name, support email, address) are
interpolated from `siteConfig` (itself sourced from `env`), so updating
one environment variable updates every legal page consistently — the
"structured so it can easily be updated later" requirement satisfied by
the component and data-flow boundary, not by a comment.

The Refund & Cancellation Policy explicitly disambiguates two things this
codebase already keeps separate: TravelOS's own subscription billing
(what this policy covers) versus the cancellation/refund terms an agency
configures for its own travel customers (`CancellationPolicy`, a
completely different, already-built feature). Getting these confused in a
public legal document would be a real, misleading error, not just an
inconsistency.

### Contact & trust (Phase 4)

`siteConfig` (`features/marketing/lib/site-config.ts`) is the single
source of every identity fact — support email, legal company name,
address, social links — each falling back to an explicitly-labelled
placeholder (e.g. `"TravelOS, Inc. (placeholder — set COMPANY_LEGAL_NAME)"`)
so the site never silently ships fabricated-looking real-sounding company
information. Six new optional env vars: `SITE_URL`, `SUPPORT_EMAIL`,
`COMPANY_LEGAL_NAME`, `COMPANY_ADDRESS`, `SOCIAL_TWITTER_URL`,
`SOCIAL_LINKEDIN_URL`. The footer renders social links only when
configured, and links every legal page, every marketing page, and the
support mailto address.

### SEO & verification readiness (Phase 5)

`metadataBase`, Open Graph, Twitter card, and per-page canonical URLs
(`alternates.canonical`) on every marketing and legal page. `robots.ts`
and `sitemap.ts` (Next.js App Router metadata routes) — the sitemap is an
explicit list of every indexable URL (mirroring `TENANT_SCOPED_MODELS`'s
explicit-allowlist convention), not crawled from the filesystem. A
generated `icon.tsx` and `opengraph-image.tsx` (via `next/og`'s
`ImageResponse`) replace the stock Next.js favicon with something
intentional, since no designed brand mark exists yet. `robots: {index:
false}` added to the three genuinely private routes (`onboarding`,
`invite/[token]`, and the whole `[tenantSlug]` dashboard tree) as defense
in depth alongside `robots.txt`'s own disallow rules.

#### Paddle verification checklist — audited against this sprint's output

| Requirement | Status |
|---|---|
| Terms of Service, reachable, complete | ✅ `/terms` |
| Privacy Policy, reachable, complete | ✅ `/privacy` |
| Refund/Cancellation policy | ✅ `/refund-policy` |
| Clear product description & pricing | ✅ Home, Features, Pricing (live data) |
| Working contact method | ✅ `/contact` + support email in footer |
| Company name & registered address on legal pages | 🟡 Present structurally, **placeholder values** — must set `COMPANY_LEGAL_NAME`/`COMPANY_ADDRESS` to the real registered entity before submission |
| Support email | 🟡 Placeholder (`support@travelos.app`) — must set `SUPPORT_EMAIL` |
| No broken links / dead navigation | ✅ Verified (see Phase 6) |
| robots.txt / sitemap.xml reachable unauthenticated | ✅ **Fixed this sprint** — see the bug below; previously would have failed silently |
| No placeholder/lorem ipsum content | ✅ |
| Favicon / brand mark | 🟡 Generated placeholder (`icon.tsx`), not a designed logo |
| Live, publicly reachable domain over HTTPS | ⬜ Deployment-dependent, not verifiable from this environment |
| Payment processor named in Terms | ⬜ Currently generic ("a payment provider") since Paddle isn't integrated yet — update once it is |
| Working checkout to actually test | ⬜ Explicitly out of scope this sprint — the next sprint's mission |

### One serious bug caught in Phase 6 self-review, not after

Every new marketing and legal page, and the three new metadata routes
(`robots.txt`, `sitemap.xml`, `icon`, `opengraph-image`), were **silently
redirecting to `/sign-in`**. The auth middleware's `PUBLIC_ROUTES`
allow-list (`auth.config.ts`) defaults to deny — any path not explicitly
listed requires a session — and none of this sprint's new routes were in
it. This was caught only by actually running the dev server and curling
every new route (`verify` discipline, not just `tsc`/build), which is
precisely how a build can go fully green while the entire public website
it produced is invisible to every search engine, crawler, and
verification bot. Fixed: all nine new pages and all four metadata routes
added to `PUBLIC_ROUTES`, with a new test file section asserting each one
resolves `authorized: true` signed out, mirroring the existing test
coverage for `/invite/[token]`.

A second, smaller bug from the same verification pass: the root layout's
new `title.template` appended `"— TravelOS"` to every page's title a
second time, because all 60+ existing pages across the entire app
(dashboard, settings, invoices, quotes, ...) already set a complete
`"X — TravelOS"` title of their own — a pre-existing, established
convention this sprint's `layout.tsx` change didn't account for. Fixed by
removing the template and keeping `title` a plain fallback string, used
only by a route with no title of its own.

### Deployment readiness (Phase 6)

Full internal link audit across every new page (nav, footer, and every
in-body cross-link between legal pages) — every target resolves to a real
route. `next build` succeeds with all 22 marketing/legal/metadata routes
present; `/pricing` is the one route marked dynamic (by design — see
above). Verified end-to-end against a running dev server, not just typechecked:
every new page returns `200`, `robots.txt`/`sitemap.xml`/`icon`/
`opengraph-image` all return `200` and correct content types, canonical
URLs and Open Graph tags resolve correctly through `metadataBase`, and the
generated OG image and favicon were visually inspected. `vercel.json`
committed but deployment itself was not performed, per this sprint's own
instruction.

### Files, database, APIs

New: `src/features/marketing/{lib,components}` (site config, nav links,
features content, legal constants, nav/footer/hero/legal-document
components). Nine new pages under `(marketing)`. `src/app/robots.ts`,
`sitemap.ts`, `icon.tsx`, `opengraph-image.tsx`. `vercel.json`. Modified:
`layout.tsx` (full metadata), `auth.config.ts` (public routes — the bug
fix above), `env.ts` (six new optional public-identity vars),
`(dashboard)/[tenantSlug]/layout.tsx`/`onboarding/page.tsx`/
`invite/[token]/page.tsx` (explicit `noindex`). No database schema
changes — Pricing reads the existing `Plan` table.

### Tests, gates

9 new test cases in `auth.config.test.ts` (every new public page and every
new metadata route resolves `authorized: true` signed out) — directly
covering the bug this sprint's self-review found, not just the pages
around it. 237 total tests passing (was 235). tsc, lint, and production
build all green.

### Remaining verification gaps (named, not silent)

Real company legal name, registered address, and support email — every
occurrence is wired through `env`, but the shipped defaults are
explicitly-labelled placeholders, not real values; **this is the single
highest-priority item before Paddle verification**, since a reviewer will
see the placeholder text if these aren't set. A designed logo/favicon (the
generated monogram is intentional, not decorative-final). `SITE_URL` (or
`AUTH_URL`) must point at the real production domain — unset, every
canonical URL and sitemap entry resolves to `localhost:3000`. Terms of
Service' payment section still speaks generically about "a payment
provider" — update to name Paddle once it's integrated. No working
checkout exists to test — by this sprint's own explicit instruction, not
a gap in this sprint's scope. Legal page content is a strong professional
draft, not legal advice — real counsel should review before relying on it
commercially.

### Production readiness assessment

The site itself — routing, metadata, legal content structure, and the
one real database-backed page — is production-shaped and was verified
live, not just built. What is **not** ready is entirely outside this
sprint's own stated mission: real company identity data (a five-minute
fix once the real values are known) and, as explicitly scoped, any actual
payment integration. The bug this sprint caught in its own self-review —
an entire public website silently gated behind a sign-in redirect — is
exactly the class of failure that would have made every other part of
this work invisible to a verification reviewer; finding it before this
ships, rather than after a submission bounces, is the sprint's most
consequential outcome.

## 28. Sprint — Hotelbeds Execution Capability (Commercial Grade)

The second `SupplierExecutionProvider` implementation, and the sprint that
actually tests §24's central claim: that Duffel was one adapter, not the
architecture. It was. The engine, the claim-based concurrency guard, the
`SupplierOrder`/`SupplierOrderEvent` two-record pattern, the audit trail,
and the automation/communication hooks are all reused **unchanged** —
zero lines of `engine.ts`'s orchestration logic needed to know Hotelbeds
exists.

### Architecture decisions

- **`ExecutionResult`'s `awaitingPayment: boolean` → `status` enum.** The
  boolean could only ever pick between two post-success landing states.
  Hotelbeds needed a third: `AWAITING_SUPPLIER_CONFIRMATION`, for its "ON
  REQUEST" bookings (a real reference is issued, but the supplier hasn't
  guaranteed the room yet). Widening the field, not adding a second flag,
  keeps the states mutually exclusive by construction. `engine.ts` now
  uses `result.status` directly instead of a ternary.
- **`AWAITING_SUPPLIER_CONFIRMATION` as a schema-level status**, not a
  Hotelbeds-specific one — framed generically (any provider with async
  confirmation lands here) — following the exact precedent
  `AWAITING_PAYMENT` set in §24: modeled in the lifecycle and transition
  table now; auto-resolution (polling or a webhook to confirm/reject the
  pending booking) is correctly deferred to when Background Jobs exist,
  named below rather than silently skipped.
- **`PassengerInput` widened**, not forked into a parallel `GuestInput`.
  Hotelbeds needs `travellerType` (for AD/CH occupancy) and `isPrimary`
  (to pick the reservation holder) — both already exist on
  `BookingTraveller`, just never threaded through. Duffel ignores both
  fields exactly as it already ignores passport fields when they don't
  apply — this is reuse, not "provider-specific branching outside the
  provider," which the sprint brief explicitly forbade.
- **`ExecutionRequest` gained `supplierOrderId`.** Hotelbeds sends it as
  `clientReference` on the booking call, so a booking on Hotelbeds' own
  dashboard traces back to the exact TravelOS row without a support
  ticket. Duffel doesn't need it; the field costs it nothing.
- **The one unavoidable branch point** — which provider a `BookingItem`
  routes to — lives in exactly one place:
  `execution.action.ts`'s `prepareExecution()`, a three-line dispatch on
  `itemType`. Every Hotelbeds-specific concern (AD/CH pax mapping, age
  calculation, no-hold money model, single-step cancellation, ON REQUEST
  status mapping) lives inside `HotelbedsExecutionProvider` itself.
  Nothing outside that file or the one dispatch line knows Hotelbeds
  exists.
- **Money-safety asymmetry, handled explicitly, not assumed away.**
  Hotelbeds has no hold concept — every booking commits against the
  tenant's pre-funded credit balance immediately, so `paymentMode` is
  always `BALANCE`. `HotelbedsExecutionProvider.execute()` refuses to run
  if it's ever called with `HOLD` (an invariant that can't currently be
  tripped by the action layer, but the provider doesn't trust its
  caller for a real-money decision) rather than silently treating a hold
  request as a paid purchase.
- **An unrecognized post-booking status is never treated as failure.**
  If Hotelbeds returns a booking reference with a status outside the four
  documented values, `toExecutionStatus()` treats it as confirmed (a
  reference exists — money is very likely committed) and preserves the
  raw wire value in `providerMetadata` for a human to check, rather than
  marking a real order `SUPPLIER_FAILED` and losing track of it.

### APIs implemented

`HotelbedsClient` gained three booking-lifecycle methods, extending the
existing client rather than a parallel HTTP path (matching every other
Hotelbeds call in the codebase):

- `createBooking()` — `POST /hotel-api/1.0/bookings`. Commits real money
  immediately (no hold). Returns `null` on a business-rule rejection
  (200 response, no `booking.reference`) rather than throwing — a
  non-retryable failure, not a network error.
- `getBookingStatus()` — `GET /hotel-api/1.0/bookings/:reference`.
  Reconciliation read; nothing calls it automatically yet (named below).
- `cancelBooking()` — `DELETE /hotel-api/1.0/bookings/:reference?
  cancellationFlag=CANCELLATION`. A single call, unlike Duffel's two-step
  quote-then-confirm cancellation — Hotelbeds' cancellation model is
  simpler, not a corner cut.

### Database changes

One migration
(`20260713030000_add_hotelbeds_execution_provider`), two `AlterEnum`
statements, applied cleanly:

- `SupplierOrderProvider` gained `HOTELBEDS`.
- `SupplierOrderStatus` gained `AWAITING_SUPPLIER_CONFIRMATION`, wired
  into `ALLOWED_TRANSITIONS` and `CANCELLABLE_STATUSES` in
  `lib/status.ts`.

No new tables — `SupplierOrder`/`SupplierOrderEvent` are already
provider-agnostic by column shape; only their enum domains widened.

### Files modified

New: `src/features/supplier-execution/providers/hotelbeds/
hotelbeds-execution-provider.ts` (+ test). Widened:
`lib/types.ts` (`ExecutionResult`, `PassengerInput`, `ExecutionRequest`,
`SupplierExecutionProvider.provider`), `lib/engine.ts` (`ExecuteOutcome`),
`lib/status.ts` (+ test), `providers/duffel/duffel-execution-provider.ts`
(status field only — no behavior change), `providers/hotelbeds/
hotelbeds-client.ts` and `hotelbeds-mapper.ts` (+ tests, 5 new DTOs in
`integrations/lib/dto.ts`). Refactored:
`actions/execution.action.ts` (per-type dispatch — `prepareFlightExecution`
/`prepareHotelExecution`/`prepareExecution`; `toPassengerInput()` now
populates `travellerType`/`isPrimary`; `cancelExecutionAction` and
`onExecutionOutcome` now branch on the order's actual `provider` instead
of assuming Duffel). Generalized:
`queries/list-supplier-orders.query.ts` (widened the `FLIGHT`-only filter
to include `HOTEL`; type-driven provider/paymentMode defaults for
not-yet-executed lines), `components/supplier-execution-section.tsx`
(copy no longer says "Duffel" unconditionally; cancel offered for
`AWAITING_SUPPLIER_CONFIRMATION` too).

### Safety review (Phase 5)

- **Idempotency / duplicate-booking prevention** — unchanged, reused:
  `SupplierOrder.bookingItemId`/`idempotencyKey` unique constraints and
  the atomic `claimAndExecute` `updateMany` guard against a second
  execution regardless of provider. No booking or cancellation can
  execute twice through this path for either supplier.
- **Tenant isolation** — every query in the new/changed code goes through
  `TenantDb`; no raw client bypasses the tenant scoping extension.
- **RBAC** — unchanged permission keys (`booking:update`/`manage`); no
  new capability was added that needed a new permission.
- **Audit trail** — `writeAudit` and `SupplierOrderEvent` fire on the same
  events for both providers; `onExecutionOutcome` generalized its
  supplier name and communication copy rather than duplicating the
  function per provider.
- No new bug was found in this self-review pass — the design decisions
  above (the `BALANCE`-only guard, the unrecognized-status handling) were
  built defensively the first time, not patched in afterward.

### Tests, gates

11 new tests this sprint (4 mapper tests for the booking DTOs, 7 for
`ageFromDob`/`toExecutionStatus`) plus the 2 already-added lifecycle
tests for `AWAITING_SUPPLIER_CONFIRMATION`. 252 total passing. `tsc
--noEmit`, `eslint`, and `next build` all clean.

### Remaining Hotelbeds limitations (named, not silent)

- **Single room only.** `CreateHotelBookingInput` supports one room
  (`roomId: 1` throughout) — nothing upstream of this collects a
  per-guest room assignment for multi-room bookings.
- **Infants aren't declared as paxes.** Hotelbeds' hotel occupancy model
  has no infant-in-own-bed concept the way Duffel has an infant fare
  class; infant travellers are excluded from the pax list rather than
  mis-mapped to AD or CH.
- **No automated reconciliation of `AWAITING_SUPPLIER_CONFIRMATION`.**
  `getBookingStatus()` exists and is the mechanism, but nothing polls it
  yet — needs Background Jobs, the same correctly-deferred gap
  `AWAITING_PAYMENT` already has.
- **No "pay for a HOLD order" flow** — inherited from §24, unaffected by
  this sprint (Hotelbeds never holds).
- **`modify()` not implemented** for Hotelbeds either — fare/room
  modification is its own feature, same as Duffel.
- **Not exercised against live Hotelbeds sandbox** — see Production
  readiness below.

### Explicit comparison against the Duffel provider — has Hotelbeds reached parity?

**Yes, structurally — no, operationally (network-blocked, not a code
gap).** Point by point:

| Capability | Duffel | Hotelbeds | Parity? |
|---|---|---|---|
| Implements `SupplierExecutionProvider` | ✅ | ✅ | Yes |
| Goes through the same `claimAndExecute`/`claimAndCancel` engine | ✅ | ✅ | Yes |
| Reuses `SupplierOrder`/`SupplierOrderEvent` unchanged | ✅ | ✅ | Yes |
| Reuses `SupplierConfirmation`/`Voucher` for confirmation + voucher retrieval | ✅ | ✅ | Yes |
| Wired into `execution.action.ts`'s request/retry/cancel actions | ✅ | ✅ | Yes |
| Visible in the Supplier Execution UI | ✅ | ✅ (this sprint's query/UI fix) | Yes |
| Idempotent, tenant-isolated, audited | ✅ | ✅ | Yes |
| Retry path | ✅ (classified `retryable`) | ✅ (same classification, same engine) | Yes |
| Error classification reused (`lib/error-classification.ts`) | ✅ | ✅ (no Hotelbeds-specific override needed) | Yes |
| Cancellation | ✅ (2-step quote+confirm) | ✅ (1-step) | Yes — different call shape, same `CancellationResult` contract |
| Automated retry / auto-resolution of the "confirm later" state | ❌ (needs Background Jobs) | ❌ (needs Background Jobs) | Equal gap, not a Hotelbeds-specific shortfall |
| Verified against a live supplier sandbox this session | ❌ (blocked, see §21/§24) | ❌ (blocked, same environment constraint) | Equal — see below |

The only asymmetry that is a real, permanent difference (not a gap) is
the payment model: Duffel supports HOLD, Hotelbeds never does. That is a
supplier fact, not an implementation shortfall, and both providers honor
their own model correctly rather than TravelOS papering over the
difference.

### Production readiness assessment

**Verified by execution:** the schema migration applied cleanly against
a real local Postgres; `tsc --noEmit`, `eslint`, and `next build` all
pass with the new code live in the tree.

**Verified by tests:** the new pure-logic surfaces — `ageFromDob`,
`toExecutionStatus`, the booking-payload/response mapper methods
(`toCreateBookingPayload`, `toHotelBookingDto`, `toCancelBookingDto`),
and the widened lifecycle transition table — all have unit coverage and
pass. `HotelbedsExecutionProvider.execute()`/`cancel()`'s orchestration
itself is untested directly, consistent with the same choice already
made for `DuffelExecutionProvider` in §24 (thin glue over an
already-tested client + already-tested mapper).

**Not externally verifiable in this environment:** an actual live call
to `POST /hotel-api/1.0/bookings` against Hotelbeds' test API — this
sandbox has no outbound network access to `api.test.hotelbeds.com` (the
same constraint documented in §21 for Duffel, re-confirmed this session
for the E2E-validation-harness work). Nothing in this sprint claims that
path has been exercised for real. `scripts/validate-suppliers.mjs`
already validates Hotelbeds' read-only content/search endpoints from an
environment with real egress; extending it with a `createBooking`/
`cancelBooking` suite — mirroring the `--with-order` Duffel suite already
built — is the concrete next step once network access allows it, and
should follow the same HOLD-equivalent safety discipline: since Hotelbeds
has no hold, a real validation run commits real (test-account) money and
must immediately cancel what it created, with the same "MANUAL CLEANUP
REQUIRED" fail-safe messaging on any step that can't confirm the
cancellation succeeded.

## 29. Sprint — Customer Portal Capability

TravelOS's first traveler-facing surface. Everything before this sprint
was an internal operations tool for agency staff; this sprint adds a
second, categorically different front door — a customer never has agency
credentials, agency permissions, or agency navigation, and the two
surfaces share a codebase but not an authorization boundary.

### 1. Architecture decisions

- **A traveler is not a `User`.** `Customer` has no password, no
  `Membership`, no Auth.js row anywhere in this schema — deliberately, so
  agency staff auth and traveler auth can never be confused for one
  another in either direction. The portal gets its own two-model
  credential chain (`PortalMagicLink`, `PortalSession`) rather than
  widening `User`/`Membership` to cover a second kind of principal.
- **Auth = "prove you know one real booking," delivered as a magic
  link.** The sprint brief offered two options (magic link, or booking
  reference + email); the implementation is both at once, which is
  strictly stronger than either alone: the entry credential is booking
  reference + email (proves the requester actually has a relationship to
  a specific reservation — a bare email magic link would let anyone who
  knows a customer's email into every booking that email is attached to,
  with no proof of ownership), delivered via a single-use, 15-minute
  token (not a password, nothing to phish long-term). The resulting
  session is scoped to the *customer*, not the one booking — so a
  traveler with three bookings signs in once and sees all three, matching
  how a real "manage my trips" portal should feel.
- **Token shape reuses the `Invitation` precedent, not a new pattern.**
  `PortalMagicLink`/`PortalSession` both split "row id" from "bearer
  token" exactly the way `Invitation.token` already does — the id
  identifies the row, the token is the secret, and only the token is
  handed to the browser (session cookie) or embedded in a URL (magic
  link). `generateMagicLinkToken`/`generateSessionToken`
  (`features/portal/lib/`) are `randomBytes(32).toString("base64url")`,
  the same primitive `generateInvitationToken` already uses.
- **The portal timeline is synthesized, not `BookingActivity`.** Staff
  activity notes routinely contain internal language ("Executed against
  an unpaid booking (manager override)", "Supplier execution needs manual
  reconciliation" — real strings from earlier sprints in this codebase).
  Rather than filter that after the fact — one missed field away from a
  leak — `getPortalBookingDetail` builds the "timeline of updates" from
  already-structured, known-safe timestamps instead:
  `Booking.confirmedAt/cancelledAt`, `SupplierConfirmation.respondedAt`,
  `Invoice.issuedAt`, `Payment.receivedAt`, `Voucher.issuedAt`. No new
  schema, no risk of a free-text field leaking through.
- **Documents are delivered as print-friendly pages, not a new PDF
  pipeline.** This codebase's existing convention for a document a
  customer needs to keep (`VoucherView`) is a plain, high-contrast page
  meant for the browser's own print-to-PDF — not a PDF-generation
  dependency. The portal's invoice/voucher views follow the identical
  convention rather than introducing one.
- **Payments phase reuses the M4 Sprint 3 Invoicing & Payments domain,
  explicitly not the Commercial SaaS Capability's billing.** TravelOS has
  two "billing" relationships already in this schema and they must never
  cross: `Invoice`/`Payment` (the agency's ledger toward its own travel
  customers) and `Subscription`/`BillingAccount`/`PaymentProvider` (this
  platform's ledger toward the agency). The portal's Payments phase reads
  only the former. The sprint brief's "future Paddle integration point"
  refers to eventually letting a traveler pay their balance online
  through this same portal — not implemented this sprint (read-only), and
  categorically not the same Paddle integration point the Commercial SaaS
  Capability names for agency subscriptions.

### 2. Security model

- **Tenant isolation**: every portal query takes `tenantId` explicitly in
  its `where` clause (never relies on the tenant-scoped `db` extension
  alone) — the same double-layer discipline `requirePermission` already
  established for staff routes.
- **Traveler isolation**: every portal query also takes `customerId`
  explicitly — a booking, invoice, or voucher query that matches
  `tenantId` but not `customerId` returns `null`, not another customer's
  data. Caught and fixed in this sprint's own Phase 7 self-review:
  `listPortalBookingDocuments` originally trusted its caller to have
  already checked ownership rather than checking it itself, the one
  function in the feature that didn't follow the rule every other query
  here follows. Fixed before it shipped.
- **No enumeration.** `requestPortalAccessAction` returns the identical
  response — "If those details match a booking with us, we've sent a
  link…" — whether the booking reference doesn't exist, the email doesn't
  match, or the tenant slug is wrong. The `/verify` route does the same:
  wrong tenant, expired, already-used, and outright invalid all redirect
  to the same `?error=invalid_link` state.
- **Signed, expiring, single-use links.** Magic links are 256-bit random
  tokens, 15-minute TTL, and consumed via an atomic
  `updateMany({ where: { consumedAt: null } })` claim — the same
  optimistic-lock pattern `claimAndExecute` uses for supplier orders — so
  a link opened twice (an email client's link-scanner racing the real
  click is the common real case) mints at most one session.
- **Sessions are fixed-TTL and revocable.** 14 days from creation, not a
  sliding window; `revokedAt` lets "sign out" (and, if ever needed, an
  agency-initiated force-logout) actually invalidate a live cookie rather
  than just clearing it client-side.
- **Cross-tenant cookie reuse is explicitly rejected, not just
  unlikely.** The session cookie is scoped to path `/portal` (not
  `/portal/[tenantSlug]`), so the same browser sends the same cookie to
  every tenant's portal URL. `resolvePortalSession` cross-checks the
  session's own `tenantId` against the tenant resolved from the current
  URL and rejects a mismatch outright — verified live in this sprint's
  own validation pass (below), not just reasoned about.
- **Audit trail** reuses the existing `AuditLog` table rather than a
  parallel log — `writePortalAudit` (`shared/lib/audit.ts`) writes
  `userId: null` (a traveler isn't a `User`, and `AuditLog.userId` has a
  real foreign key to `User`) with `customerId` carried in `metadata`,
  tagged `entity: "portal_session"` so every portal event is one filter
  away regardless of which action wrote it. Logged: access requested,
  session created, verify rejected (with reason: wrong tenant / expired /
  already used), voucher viewed, invoice viewed, sign-out. Not logged:
  routine list views (dashboard, payments overview, messages) — audited
  at the level of "a specific sensitive document was opened," not every
  page paint.
- **Independent rate limits**, both new, both built on the same generic
  `check()` primitive `checkInvitationRateLimit` already used: 5 access
  requests per (tenant, email) per hour, and 20 per IP per hour across
  all tenants/emails — the second is what actually stops someone
  probing many (reference, email) guesses, since the first limit alone
  is defeated by simply trying a different email each time.
- **The middleware bug this sprint would have shipped with, caught during
  audit instead of after.** `middleware.ts`'s `authorized()` callback
  default-denies any path not explicitly listed public. Without adding
  `/portal/` to `PUBLIC_ROUTE_PREFIXES`, every portal request would have
  redirected to staff `/sign-in` — the exact bug class PROJECT.md's
  "Public Website & Verification Readiness" sprint (§27) already caught
  once for the marketing pages. Fixed in `auth.config.ts` before any
  portal page was reachable, per this sprint's Phase 1 audit rather than
  discovered by trying to load the site.

### 3. APIs added

- `requestPortalAccessAction(tenantSlug, { bookingReference, email })` —
  the only mutating portal Server Action besides sign-out; issues a
  magic-link email via `sendCommunication`.
- `GET /portal/[tenantSlug]/verify?token=…` — Route Handler (not a Server
  Action, since it needs to set a cookie and redirect from a bare GET);
  exchanges the token for a session.
- `portalSignOutAction(tenantSlug)` — revokes the session, clears the
  cookie.
- Read queries (`features/portal/queries/`): `listPortalBookings`,
  `getPortalBookingDetail`, `listPortalBookingDocuments`,
  `getPortalVoucher`, `getPortalInvoice`, `getPortalPaymentsOverview`,
  `listPortalCommunications` — all pure `(db, tenantId, customerId, …) →
  data` functions, none of them Server Actions (nothing here mutates).

### 4. Database changes

One migration (`20260713040000_add_customer_portal_capability`), two new
tables, no changes to any existing model's columns (only two new relation
fields on `Tenant` and `Customer`):

- `portal_magic_links` — `tenantId`, `customerId`, `token` (unique),
  `expiresAt`, `consumedAt`, `requestedBookingReference`, `requestIp`.
- `portal_sessions` — `tenantId`, `customerId`, `token` (unique),
  `expiresAt`, `lastSeenAt`, `revokedAt`, `createdIp`, `userAgent`.

Both added to `TENANT_SCOPED_MODELS` in `shared/lib/db.ts` so `tenantId`
auto-injection covers them the same way it covers every other tenant-owned
table.

### 5. UI pages created

All under `src/app/portal/[tenantSlug]/`, with its own header/nav
(`PortalHeader`) — deliberately not a reuse of the staff sidebar, so a
traveler's screen never even lists agency-operations navigation:

- `/access` — booking reference + email request form.
- `/verify` — Route Handler, no UI of its own.
- `/dashboard` — "Your trips": every booking for this customer, as cards
  (status, dates, traveller count, total, balance due).
- `/bookings/[bookingId]` — trip overview: line items with supplier
  confirmation status, traveller list, customer-facing notes, and the
  synthesized timeline.
- `/bookings/[bookingId]/documents` — invoices, vouchers, and any staff-
  attached files for that booking.
- `/bookings/[bookingId]/invoices/[invoiceId]` and
  `/bookings/[bookingId]/vouchers/[voucherId]` — print-friendly detail
  views.
- `/payments` — aggregate balance/paid/history across every booking.
- `/messages` — agency communications sent to this traveler.

### 6. Remaining future improvements (named, not silent)

- **Online payment collection** — the "future Paddle integration point"
  the sprint brief named; Payments is read-only this sprint by explicit
  instruction.
- **`AWAITING_SUPPLIER_CONFIRMATION` auto-resolution** is still the same
  named, deferred gap it was in §28 — the portal just displays whatever
  state the order is actually in, it doesn't change when that state
  updates.
- **Shared-email edge case in Communications**: `listPortalCommunications`
  matches by recipient email, not a `customerId` foreign key on
  `CommunicationMessage` (that column doesn't exist) — two `Customer`
  rows in the same tenant sharing one email would see each other's mail.
  Documented in the query's own doc-comment; fixing it properly means a
  schema change out of scope for this sprint.
- **No "resend/manage sessions" UI** — a traveler can't see or revoke
  their own other active sessions (e.g. "signed in on another device").
  The data model supports it (`PortalSession` is already a real, listable
  table); no UI was built for it this sprint.
- **No customer-level document scope** — only files attached directly to
  a specific booking (`ownerType: "booking"`) are shown; a document
  attached at the customer level (e.g. a master passport scan reused
  across bookings) isn't surfaced. A deliberate, conservative scoping
  choice this sprint, not an oversight — see `documents.query.ts`.
- **Mobile apps, support chat, loyalty features** — explicitly out of
  scope per the sprint brief; not started.

### 7. Production readiness assessment

**Verified by execution** (a real local Postgres, a running `next dev`
server, real HTTP requests — not just reasoning about the code): every
security property named in §2 above was driven live in this sprint's own
validation pass, using disposable fixture data (two tenants, cancelled
and multi-booking scenarios, cross-tenant customers) that was created,
exercised, and fully deleted afterward:
- The middleware fix — `/portal/*` reachable without a staff session,
  confirmed by an actual 200 (not a redirect to `/sign-in`).
- Full magic-link lifecycle: valid token → session + redirect; the same
  token replayed → rejected; expired token → rejected; already-consumed
  token → rejected; a valid token presented on the *wrong tenant's* URL →
  rejected; missing/garbage token → rejected. All six paths return the
  identical response.
- An authenticated session correctly lists all three of a customer's
  bookings (including the cancelled one, with its correct status and
  reason), and is correctly rejected the moment it's used against a
  *different* tenant's portal URL with the same cookie — the cross-tenant
  cookie-reuse defense actually holds, not just in theory.
- Revoking a session (what sign-out does) immediately invalidates that
  session's cookie on the next request.
- Cross-customer access attempts (same tenant, wrong `customerId`) against
  booking detail, documents, vouchers, and invoices all correctly return
  null/404 — including via the live query layer with a deliberately
  wrong `customerId` passed in, not just "the UI wouldn't offer this
  link."
- The invoice and voucher print pages render real fixture data
  correctly and — checked explicitly — never render the fixture's
  planted internal-only text ("INTERNAL ONLY: 10% commission booked",
  "INTERNAL ONLY: agent gave a manual discount") anywhere in the HTML.
- Audit rows (`portal_voucher_viewed`, `portal_invoice_viewed`) were
  actually written during the run, confirmed by querying `AuditLog`
  directly afterward.

**Verified by tests**: token generation/entropy/expiry math
(`magic-link-token.test.ts`, `session-token.test.ts`) and the magic-link
email template (`portal-magic-link.test.ts`) — pure-logic unit coverage,
the same discipline every prior sprint in this codebase has applied; the
query-layer orchestration itself is exercised by the live validation pass
above rather than mocked unit tests, consistent with how this codebase
has always treated DB-touching query/action functions.

**Not externally verifiable in this environment**: actual email delivery
— no `RESEND_API_KEY` is configured in this sandbox, so
`requestPortalAccessAction`'s send call reports `not_configured`
(recorded as a `SKIPPED` `CommunicationMessage`, not silently dropped)
rather than actually reaching an inbox. The magic-link *token* mechanics
downstream of "the customer clicked a link" were fully validated (above);
only the "does the email actually arrive, formatted correctly, in a real
inbox" step wasn't. Also not stress-tested live: the two new rate limiters
under real concurrent load — they're thin wrappers around the same
`check()` primitive already backing `checkInvitationRateLimit`, so this is
a code-reuse argument, not a live-load one.

**Overall**: the security model is real and was proven against a live
server, not just designed — tenant isolation, traveler isolation, no-
enumeration, single-use expiring links, cross-tenant cookie rejection, and
internal-data-stripping all held up under actual HTTP requests with
adversarial inputs (wrong tenant, wrong customer, replayed token, expired
token). What's left before a real agency's customers could use this in
production is entirely on the delivery side (a configured email provider)
and the named future work above (online payment collection, session
management UI) — not the authorization boundary itself.

**Pre-production follow-ups (post-launch audit):** two customer-facing
gaps found during a pre-production readiness pass. First, the booking
detail page rendered `SUPPLIER_ORDER_STATUS_LABELS` — the agency-staff
label set from `supplier-execution/lib/status.ts` (`"Execution failed"`,
`"Needs manual reconciliation"`, `"Not yet executed"`) — verbatim to
travelers. `portalSupplierStatusLabel()` (`features/portal/lib/format.ts`)
is a separate, customer-appropriate translation: it returns `null` (no
badge shown) for internal/transient/failure states a customer has no way
to act on, and a plain label only for states worth telling them about
(`SUPPLIER_CONFIRMED` → "Confirmed", `AWAITING_SUPPLIER_CONFIRMATION` →
"Awaiting supplier confirmation", `AWAITING_PAYMENT` → "Reserved",
`CANCELLED` → "Cancelled"). Second, the portal footer had no links to the
already-built legal pages (`/terms`, `/privacy`, `/refund-policy` — Public
Website sprint) — added.
## 30. Hotelbeds Certification — Rate Comments

Hotelbeds certification requires rate conditions/notices (`rateComments`)
to be surfaced to the booking agent before a draft booking is created,
for both BOOKABLE and RECHECK rates.

- **Captured once, in the function both rate types already share.**
  `HotelbedsMapper`'s private `toRateDto()` is the single place that
  builds a `HotelRateDto`, called by both `toAvailabilityDtos()`
  (search/BOOKABLE) and `toRateCheckDto()` (checkrates/RECHECK) — adding
  `rateComments` there once satisfies both without a rate-type branch.
- **Captured verbatim, not re-worded or translated.** Certification
  expects the supplier's own wording to reach the agent unchanged; the
  mapper's usual defensive `str()` helper is used (missing/empty → null)
  with no reformatting.
- **Persisted onto `BookingItem.supplierRateComments` at booking-prep
  time**, the same snapshot-at-write pattern `BookingItem.notes` already
  uses for the RECHECK flag — a booking keeps the comment that was true
  when it was made, not a value that could drift if re-fetched later.
- **Known limitation, deliberately not built:** Hotelbeds may return
  `rateComments` as a reference code requiring a secondary
  `GET /hotel-content-api/1.0/types/ratecomments/{code}` lookup for full
  text, similar to the existing `listFacilities()`-style Content API
  calls in `hotelbeds-client.ts`. Whether the sandbox actually does this
  could not be verified (no live network access in this environment —
  see §21's certification notes). Building that secondary lookup on a
  guess risked shipping an unverified integration with no test able to
  catch a wrong assumption; the primary (inline field) path is
  implemented and verified, and this ambiguity is left as a named
  follow-up rather than guessed at.

## 31. Hotelbeds Certification — Booking Status Resolution Capability

Closes a certification gap: a Hotelbeds "ON REQUEST" booking (wire status
`PENDING`) previously never resolved. `HotelbedsClient.getBookingStatus()`
existed but nothing called it — a booking landed in
`AWAITING_SUPPLIER_CONFIRMATION` and stayed there forever, while
`onExecutionOutcome` incorrectly treated it identically to a real
confirmation (marked `SupplierConfirmation.status = "CONFIRMED"` and
emailed the customer a confirmed-booking notice before the property had
actually confirmed anything). This sprint fixes both: the false-confirm
bug, and the missing resolution path.

### 1. Why `getBookingStatus()` was unreachable

Purely a wiring gap, not a broken implementation. `getBookingStatus()`
(`hotelbeds-client.ts`) correctly calls
`GET /hotel-api/1.0/bookings/{reference}` and maps the response — but no
code path anywhere called it: no polling loop, no webhook receiver, no job
type. `SupplierOrderStatus` already modeled
`AWAITING_SUPPLIER_CONFIRMATION` with allowed transitions to
`SUPPLIER_CONFIRMED`/`CANCELLED`/`SUPPLIER_FAILED`, so the FSM was ready;
only the thing that would actually walk it forward was missing.

### 2. Architecture

- **Three canonical states, provider-agnostic.** `SupplierBookingStatus`
  (`supplier-execution/lib/types.ts`) is exactly
  `SUPPLIER_CONFIRMED | AWAITING_SUPPLIER_CONFIRMATION | CANCELLED` — no
  Hotelbeds-specific vocabulary above the provider adapter. A new optional
  `checkStatus?(order): Promise<StatusCheckResult>` method on
  `SupplierExecutionProvider` is how any provider plugs into resolution;
  it's optional because Duffel's orders resolve synchronously at creation
  (`SUPPLIER_CONFIRMED`/`AWAITING_PAYMENT` only — `AWAITING_SUPPLIER_CONFIRMATION`
  is a status Duffel's adapter never returns) and so never needs one. Duffel
  is untouched by this entire sprint — it doesn't implement `checkStatus`,
  and nothing about its `execute()`/`cancel()` behavior changed.
- **Pure decision core, impure shell — same split `status.ts`/`engine.ts`
  already established.** `reconciliation-plan.ts` exports
  `planReconciliation(currentStatus, checkResult) → plan`, a pure function
  with no I/O: given the order's current status and a fresh check, it
  decides `confirm` / `cancel` / `still_awaiting` / `not_applicable` /
  `check_failed`. It is fully unit-tested (`reconciliation-plan.test.ts`).
  `reconciliation.ts` is the DB-writing shell that calls it and executes
  the resulting plan — impure, and, consistent with how this codebase has
  always treated DB-touching action/query functions (see §29's own
  precedent), not unit-tested with a mocked Prisma client; there is zero
  precedent for that anywhere in this codebase, and introducing one now
  for a single feature would be the "hack" this sprint was explicitly
  asked to avoid, not a reasonable exception.
- **One reconciliation function, two callers, never duplicated.**
  `reconcileSupplierOrder(db, tenantId, supplierOrderId, provider)` is
  called by both the automatic job handler and the manual "Check now"
  server action. Neither re-implements the state-transition or
  side-effect logic — a manual check and an automatic one can never
  disagree about what "confirmed" means.
- **Idempotency is structural, not a special case.** `planReconciliation`
  returns `not_applicable` the instant `currentStatus` isn't
  `AWAITING_SUPPLIER_CONFIRMATION` — covering an order that resolved
  immediately (never entered reconciliation at all), an order a
  concurrent run already resolved, and a stale job that fires after a
  human cancelled the order by hand, all with the same one `if`.

### 3. Background scheduling — the existing Platform Automation Capability, not a new one

Requirement 4 asked "if Background Jobs already exists, integrate with
it" — it does (§26, `Job`/`JobEvent`, the handler registry, and the
existing `/api/jobs/process` route on a 5-minute Vercel cron). This sprint
adds exactly one new job type, `RECONCILE_SUPPLIER_ORDER`
(`automation/handlers/reconcile-supplier-order.handler.ts`), registered
the same one-line way `SEND_COMMUNICATION` already is
(`handlers/register.ts`). No cron expression, polling loop, or scheduling
code exists inside the Hotelbeds provider or anywhere in
`supplier-execution/` — the handler simply answers "is it resolved yet,"
and returning `{ ok: false, retryable: true }` while still awaiting hands
"check again later" entirely to the job engine's own existing backoff
(`nextAvailableAt`, 30s → capped at 30 minutes). `maxAttempts: 100` is set
at enqueue time — generous, not indefinite: comfortably past any realistic
ON REQUEST resolution window, and if genuinely never resolved, the job
dead-letters and a human sees it via the existing `DEAD_LETTER`/`JobEvent`
trail, the same "no automated way out forever" precedent
`RECONCILIATION_REQUIRED` already established for supplier execution.

### 4. Lifecycle

```
execute() → AWAITING_SUPPLIER_CONFIRMATION
              │
              ├─ BookingActivity: "Awaiting supplier confirmation"
              └─ enqueueJob(RECONCILE_SUPPLIER_ORDER, idempotencyKey=reconcile_supplier_order:{id})
                              │
                 ┌────────────┴─────────────┐
                 │ (every ~5 min, existing   │ (agent clicks "Check now")
                 │  cron → runWorker())      │
                 ▼                           ▼
         reconcileSupplierOrder(db, tenantId, supplierOrderId, provider)
                 │
                 ├─ provider.checkStatus() → SupplierOrderEvent(STATUS_CHECKED)
                 │
                 ├─ still AWAITING  → job returns retryable:true → engine reschedules (backoff)
                 ├─ SUPPLIER_CONFIRMED → SupplierOrder→CONFIRMED, SupplierOrderEvent(SUPPLIER_CONFIRMED),
                 │                       SupplierConfirmation→CONFIRMED, BookingActivity, AuditLog,
                 │                       enqueue confirmation email job
                 └─ CANCELLED       → SupplierOrder→CANCELLED, SupplierOrderEvent(CANCELLED),
                                       SupplierConfirmation→REJECTED, BookingActivity, AuditLog
```

### 5. Sequence diagram — automatic path

```
Agent          execution.action.ts        Job engine (existing)     reconciliation.ts        Hotelbeds
  │  Execute       │                              │                        │                     │
  ├───────────────►│ claimAndExecute()            │                        │                     │
  │                ├──────────────────────────────┼────────────────────────┼────────────────────►│ createBooking
  │                │                              │                        │                     │◄── status: PENDING
  │                │ onExecutionOutcome: AWAITING │                        │                     │
  │                │  BookingActivity + enqueueJob│                        │                     │
  │                │──────────────────────────────►│ Job(PENDING)          │                     │
  │                                               │ ... 5-min cron tick ...│                     │
  │                                               ├───claim───────────────►│ reconcileSupplierOrder
  │                                               │                        ├────────────────────►│ getBookingStatus
  │                                               │                        │◄──status: PENDING────┤
  │                                               │                        │ still_awaiting       │
  │                                               │◄─{ok:false,retryable}──┤                      │
  │                                               │ backoff, reschedule    │                      │
  │                                               │ ... later cron tick ...│                      │
  │                                               ├───claim───────────────►│ reconcileSupplierOrder
  │                                               │                        ├────────────────────►│ getBookingStatus
  │                                               │                        │◄─status: CONFIRMED────┤
  │                                               │                        │ confirm → writes,     │
  │                                               │                        │ enqueue email job     │
  │                                               │◄─────{ok:true}─────────┤                      │
  │  (booking detail page, next load) ◄──────────────────────────────────── SupplierConfirmation: CONFIRMED
```

### 6. UI

`SupplierExecutionSection` already rendered `AWAITING_SUPPLIER_CONFIRMATION`
with its own amber badge and human label ("Awaiting supplier
confirmation") — no raw Hotelbeds status string has ever reached this
component; `checkStatus`'s `providerMetadata.hotelbedsStatus` only ever
lands in `SupplierOrderEvent.metadata` (an internal audit field), never in
a prop. This sprint adds: a **"Check now"** button (only while
`AWAITING_SUPPLIER_CONFIRMATION`) showing **"Checking…"** during its own
`isPending`-style transition — the same idiom `hotelbeds-explorer.tsx`'s
rate-validate button already uses, not a new persisted UI state — and
timestamps: "Requested … · last checked …" while awaiting, "Confirmed …" /
"Cancelled …" once resolved. `confirmedAt`/`cancelledAt` are the existing
`SupplierOrder` columns; `lastCheckedAt` is derived from the newest
`STATUS_CHECKED` event in `listSupplierOrders` (a query addition, not a
new column) — reusing the append-only event log as the source of "when did
this last happen," this codebase's established idiom, rather than adding
a redundant timestamp column.

### 7. Deliberate scope decision: `Booking.status` is not auto-transitioned

Every `Booking.status` (DRAFT/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED)
transition in this codebase, without exception, goes through
`updateBookingStatusAction` — a manual, RBAC-gated, audited human
decision. There is no precedent anywhere of a background process moving a
booking's lifecycle stage automatically (not on invoice payment, not on an
immediate Duffel/Hotelbeds confirmation, nowhere). "Update Booking status
if confirmation arrives" is satisfied here the same way this codebase
already represents "the booking's confirmation state changed" everywhere
else: `SupplierConfirmation.status` and a `BookingActivity` entry — both
of which the reconciliation flow updates on every terminal outcome.
Auto-promoting `Booking.status` itself was considered and rejected:
inventing the codebase's first-ever automatic booking-lifecycle
transition is a materially larger, cross-cutting behavior change than
this task's own stated boundaries ("do not redesign unrelated modules")
support, and a real agency may deliberately want to review an ON
REQUEST-turned-confirmed hotel line before calling the whole booking
Confirmed. Flagged here explicitly in case a future task wants that
transition added deliberately, with its own review.

### 8. Certification impact

The certification-blocking gap — an ON REQUEST booking that never
resolves, with no eventual confirmation, cancellation, or customer
notification — is closed. Every Hotelbeds booking now reaches a terminal,
auditable, customer-notified outcome without a human needing to
periodically check the Hotelbeds dashboard by hand.

### 9. Remaining limitations

- **Resolution latency is bounded by the existing 5-minute cron plus the
  job engine's own backoff**, not by a tighter SLA — acceptable for
  Hotelbeds' typical ON REQUEST turnaround (hours, not seconds), but not a
  sub-minute guarantee. A "Check now" button exists precisely for when an
  agent doesn't want to wait for the next tick.
- **No live verification against Hotelbeds Sandbox.** Outbound network
  access to `api.test.hotelbeds.com` remains blocked in this environment
  (see §21, §30's own notes on the same constraint) — `checkStatus()`'s
  request shape and `toReconciledStatus()`'s wire-value mapping follow
  the same documented Hotelbeds Booking API contract `getBookingStatus()`
  itself was already written against, but neither has been exercised
  against a live sandbox response.
- **A genuinely stuck reconciliation (100 attempts exhausted) surfaces
  only via the existing `DEAD_LETTER` job trail**, not a dedicated staff
  notification — a human has to know to look, the same limitation
  `RECONCILIATION_REQUIRED` already carries for supplier execution
  failures more broadly.

## 32. Universal Pricing Engine

A repository-wide audit (Phase A of this sprint) found no pricing engine,
markup system, or commission calculator anywhere in this codebase, active
or dead — the only pricing-adjacent code was inert `Supplier.commissionRate`
metadata, manual flat `discount`/`tax` fields on documents, and an
unrelated manually-owned inventory catalog (`RoomType.basePrice` etc.).
Tracing the price from the Hotelbeds/Duffel API response through every
downstream consumer (`BookingItem`, `Booking`, `Invoice`, the Customer
Portal, both explorer UIs) showed the exact same number at every hop:
Hotelbeds' own `net` (wholesale) rate, or Duffel's raw `total_amount`,
reaching the customer unchanged. This section is the engine built to fix
that, per the audit's own architecture recommendation.

### 1. Where pricing happens, and why

Immediately after each supplier's mapper — the one seam every current and
future supplier already funnels through before booking-prep or any UI ever
sees a price. `HotelRateDto.price` (Hotelbeds) and `FlightOfferDto.totalAmount`
(Duffel, Amadeus) are the two provider-agnostic shapes; a pricing call
right after that point covers every supplier without a single
provider-specific line of markup code. Rejected alternatives (in the
mapper, in booking-prep only, in the execution engine, in
BookingItem/Invoice) are recorded in the Phase A audit report — each would
either duplicate pricing logic per supplier or leave some earlier
UI surface displaying the raw wholesale price.

### 2. The two-layer split: pure engine, impure boundary

- **`features/pricing/lib/calculate.ts` — `calculatePrice(cost, currency,
  components)`.** Pure, deterministic, zero I/O. Runs entirely in integer
  cents (`toCents`/`fromCents`, exported from `shared/lib/money.ts` — the
  exact primitive `computeTotals` already uses for bookings/quotes, not a
  second implementation). Fully unit-tested.
- **`features/pricing/lib/resolve.ts` — `resolveComponents(settings,
  provider)`.** Also pure: SUPPLIER override → TENANT default → GLOBAL
  (schema default, no components) precedence. Also fully unit-tested.
- **`features/pricing/lib/price.ts` — the one impure boundary.**
  `loadPricingContext(db)` reads `TenantSettings.pricingSettings` once per
  action call (via the existing `getWorkspaceSettings`, not a new query);
  `priceAmount(context, provider, cost, currency)` then runs the two pure
  functions above for each rate/offer with no further I/O.
  `priceForProvider(db, provider, cost, currency)` is the single-price
  convenience booking-prep uses. Not unit-tested itself — three lines of
  composition over already-tested pure functions plus a DB read,
  consistent with this codebase's standing rule that DB-touching functions
  aren't unit-tested with a mocked Prisma client (see Task 3's
  `reconciliation.ts` for the identical precedent).

### 3. Pricing model — the component vocabulary

A tenant's whole pricing policy is an ordered `PricingComponent[]`
(`features/pricing/schemas/pricing.schema.ts`), stored as JSON — a new
component type is a new literal in that Zod discriminated union, never a
migration:

| Type | Effect |
|---|---|
| `MARKUP_FIXED` / `MARKUP_PERCENT` | Add a flat amount / a percentage of the running total |
| `COMMISSION_PERCENT` | Same mechanics as `MARKUP_PERCENT`, tagged separately so a report can distinguish "commission earned" from "markup added" |
| `FEE_FIXED` / `FEE_PERCENT` | Add a flat or percentage fee |
| `TAX_PERCENT` | Placeholder — not a real tax-jurisdiction engine, a percentage line for a future one |
| `DISCOUNT_FIXED` / `DISCOUNT_PERCENT` | Subtract a flat amount / percentage |
| `COUPON_FIXED` | Subtract a flat, code-tagged amount |
| `PROMO_PERCENT` | Subtract a percentage, tagged separately from a general discount |
| `MIN_MARKUP_PERCENT` / `MAX_MARKUP_PERCENT` | Clamp — applied once, last, against the original cost, regardless of position in the array |
| `ROUND_TO_NEAREST` | Final rounding to the nearest configured unit (e.g. nearest whole currency unit) |

Every `amount`/`percent` is schema-validated non-negative — sign (add vs.
subtract) is implied by `type`, which is what makes "reject negative
values" a schema-level guarantee rather than a convention every caller has
to remember. Additive/subtractive components apply strictly in array
order, each percentage compounding on the running total as adjusted by
every prior component (not on the original cost) — deliberately simple
and fully deterministic; see `calculate.ts`'s own doc-comment for the
exact algorithm. `profit = sellingPrice − cost`; `marginPercent =
profit ÷ sellingPrice × 100` (gross margin, not markup — the two are easy
to conflate and this codebase picks one consistently).

### 4. Tenant support — Global / Tenant / Supplier

Reuses the exact `TenantSettings` singleton-per-tenant + per-module `Json`
column pattern this codebase already established for
`crmSettings`/`leadSettings`/`supplierSettings`/`providerSettings` — a new
`pricingSettings Json?` column, validated by `pricingSettingsSchema` on
every read and write, plugged into the *existing*
`updateModuleSettingsAction`/`getWorkspaceSettings`/`MODULE_COLUMN`
machinery rather than a parallel settings action/query file. No new
Prisma model, no new CRUD action.

```
TenantSettings.pricingSettings = {
  default:   { components: [...] },              // TENANT scope
  overrides: { HOTELBEDS: { components: [...] } } // SUPPLIER scope, one key per free-text provider tag
}
```

- **GLOBAL** is simply what `pricingSettingsSchema`'s own defaults produce
  when a tenant has never configured anything: `{ default: { components:
  [] }, overrides: {} }` — a fresh workspace starts at zero markup,
  honest and non-guessing, not an invented starter percentage.
- **TENANT** is `settings.default` once an agency configures it.
- **SUPPLIER** is `settings.overrides[PROVIDER]` — a free-text key
  (`"HOTELBEDS"`, `"DUFFEL"`, `"AMADEUS"`, or any future supplier name),
  not FK'd to an enum, so a brand-new supplier integration never needs a
  schema change here. A supplier key's mere *presence* counts as
  "configured," even with an empty `components` array — a tenant can
  deliberately zero out markup for one supplier while keeping a non-zero
  default everywhere else; `resolveComponents` checks key presence, not
  array length, specifically so that choice isn't silently ignored.
- **Future expansion** (a fourth scope, a per-destination or
  per-cabin-class rule, …) is new keys in this same JSON shape, validated
  by the same Zod schema — never a migration.

### 5. Sequence diagram

```
Agent searches Hotelbeds  ──►  searchHotelbedsAvailabilityAction
                                    │
                                    ├─ clientResult.client.searchAvailability()  (raw net rates)
                                    ├─ loadPricingContext(db)                    (one DB read)
                                    └─ priceHotelAvailability(ctx, hotels)       (pure, per rate)
                                          │
                                          ▼
                                 HotelAvailabilityDto[]  (rate.price = SELLING price)
                                          │
                                          ▼
                              hotelbeds-explorer.tsx renders rate.price as-is
                              (zero UI arithmetic — it was already priced server-side)

Agent clicks "Book"  ──►  prepareHotelBookingAction
                                    │
                                    ├─ clientResult.client.checkRates()   (raw net rate, again — live)
                                    ├─ supplierCost = check.totalNet ?? rate.price
                                    ├─ priceForProvider(db,"HOTELBEDS",supplierCost,currency)
                                    └─ validatedAmount = priced.sellingPrice
                                          │
                                          ▼
                              addBookingItemAction({ unitPrice: validatedAmount,
                                                      supplierCost })
                                          │
                                          ▼
                    BookingItem.unitPrice (charged)   BookingItem.supplierCost (owed to supplier)
                                          │
                                          ▼
        recomputeBookingTotals → Booking.total → Invoice (copied verbatim) → Portal (copied verbatim)
        — nothing downstream re-prices; the seam above is the only place pricing ever runs.
```

### 6. Integration points — what was touched, and what deliberately wasn't

Replaced (raw supplier price → engine output, before the value leaves the action):
- `searchHotelbedsAvailabilityAction`, `checkHotelbedsRatesAction` (hotelbeds.action.ts)
- `searchDuffelOffersAction`, `getDuffelOfferAction` (duffel.action.ts — the
  latter is the explorer's "Validate" re-price button)
- `searchAmadeusFlightOffersAction` (amadeus.action.ts — display-only; Amadeus
  has no booking flow yet, confirmed in the Phase A audit, but its results
  are still customer-visible and must never show a raw amount either)
- `prepareHotelBookingAction`, `prepareFlightBookingAction`
  (booking-prep.action.ts) — the authoritative, persisted charge

**Deliberately left untouched — the real supplier cost, not a display
value:** `execution.action.ts`'s `prepareHotelExecution`/
`prepareFlightExecution` (Supplier Order Execution Capability) still build
their `ExecutionRequest.amount` from the raw, unpriced supplier
response — that amount is what's actually charged to the tenant's
supplier account, and conflating it with the customer's selling price
would be the exact bug this sprint fixes, just moved one layer over. The
explorer UIs, the confirmation dialog, `BookingItem`/`Booking`/`Invoice`/
Payment/Customer Portal needed **no code changes at all** — they already
just render whatever price reached them; once that price is the priced
figure instead of the raw one, every downstream surface inherits the fix
for free. No "Reports"/"Exports" feature exists in this codebase yet
(confirmed in the Phase A audit) — nothing to wire up there.

`BookingItem.supplierCost` (new, nullable `Decimal`) captures the raw
figure the pricing engine started from, the same snapshot-at-write
precedent `supplierRateComments` already established — durable, so a
future profit/margin report can read `unitPrice − supplierCost` per line
without re-deriving anything.

### 7. Settings UI

A "Pricing" tab in Settings (`features/pricing/components/
pricing-settings-form.tsx`, wired into the existing `SettingsTabs`) edits
the tenant default and, per supplier, an optional override. It's a
generic row editor over all thirteen `PricingComponent` types (a `<Select>`
of rule type + the matching value input, added/removed freely) rather
than a fixed set of form fields — a future fourteenth component type needs
one new `COMPONENT_META` entry, never a new form section. Rows apply in
the order shown, matching `calculatePrice`'s own documented order
(additive/subtractive components compound top-to-bottom; `MIN_MARKUP_PERCENT`/
`MAX_MARKUP_PERCENT`/`ROUND_TO_NEAREST` always apply last regardless of
row position — the editor doesn't currently support drag-to-reorder, so
changing order means removing and re-adding a rule).

### 8. Example

A Hotelbeds rate with `net = 200.00 EUR`, tenant default `{ MARKUP_PERCENT:
15 }`, no HOTELBEDS override:

```
cost 200.00 → +15% (30.00) → sellingPrice 230.00
profit = 30.00, marginPercent = 30.00 / 230.00 × 100 ≈ 13.04%
```

The agent sees `EUR 230.00` in search results, the confirmation dialog,
the booking, and the invoice. `BookingItem.unitPrice = 230.00`,
`BookingItem.supplierCost = 200.00`. The `SupplierOrder`'s real execution
charge (when the line is later executed) still uses `200.00` — what
Hotelbeds is actually owed.

### 9. Limitations and future enhancements

- **The Settings UI now covers all 13 component types** (generic row
  editor, no per-type form fields needed) — rule *ordering* is still
  edit-by-remove-and-re-add rather than drag-to-reorder.
- **No live Hotelbeds/Duffel/Amadeus verification** was possible in this
  environment (network blocked — the same constraint noted throughout
  Tasks 1–3); the pricing wiring was verified against this codebase's own
  mapper/DTO contracts and the full test suite, not a live sandbox
  response.
- **Currency precision assumes 2 decimal places uniformly**, matching
  `shared/lib/money.ts`'s existing assumption everywhere else in this
  codebase (no zero-decimal-currency handling for JPY-style currencies
  anywhere yet, pricing engine included) — a stated, consistent
  limitation, not a new one this sprint introduced.
- **A pre-existing gap, not introduced by this sprint:** `updateBookingItemAction`'s
  manual "edit line" form doesn't round-trip `supplierRateComments`
  (Task 2) or `supplierCost` (this sprint) into its edit draft, so manually
  editing an existing supplier-sourced line through that form clears both
  fields to null. Both fields are still captured correctly at booking-prep
  time; this only affects a subsequent manual edit via that specific form.
  Flagged here rather than silently fixed, since it's outside this
  sprint's stated scope.
- **No dedicated Reports/Exports/profit-margin dashboard exists yet** — a
  natural next consumer of `BookingItem.supplierCost` once built.

## 33. TravelPayouts Content Synchronization Engine

Phase 1 of the architecture pivot to a sync-and-serve business model (see
`docs/ARCHITECTURE_PIVOT_PLAN.md`): TravelPayouts becomes the sole active
content source, synchronized on a schedule into the local database, with
every dashboard and public page reading only that local copy — never
calling a provider API on a request path. Built as an entirely new,
additive `features/content-sync/` module; no existing module (Supplier
Order Execution, reconciliation, the booking engine, any direct-booking
integration file) was modified, deleted, or otherwise touched. They remain
in the codebase, fully intact, simply unused by this phase — see §9 below
for why flag-gating them was explicitly out of scope for this phase.

### 1. Provider-agnostic interface, first implementation

`features/content-sync/lib/types.ts` defines `ContentSyncProvider` — the
same "one small interface, the engine depends only on this" shape as
`SupplierExecutionProvider`/`BillingProvider`/`JobHandler` elsewhere in
this codebase: `healthCheck()`, `listCountries()`, `listCities()`,
`listHotelsByCity(cityCode)`, each returning normalized DTOs
(`SyncedCountryDto`/`SyncedCityDto`/`SyncedHotelDto`). Deliberately excludes
search/availability/booking methods — a content provider only ever answers
"what exists," never "is it available." `TravelPayoutsContentProvider`
(`providers/travelpayouts/travelpayouts-provider.ts`) is the first (and
today, only) implementation, adapting `TravelPayoutsClient`'s raw
Hotellook API responses. A future Booking.com, Hotelbeds, or Expedia
*content* connector is a second implementation of this same interface —
never a change to the engine, the job handler, the schema, or any call
site's shape.

`TravelPayoutsClient` (`travelpayouts-client.ts`) reuses the existing
`providerRequest()` HTTP client (retry/backoff/rate-limit/timeout,
`features/integrations/lib/http.ts`) exactly as Hotelbeds/Duffel/Amadeus
already do. Credentials flow through the same per-tenant encrypted-secret
system as every other provider (`PROVIDER_CREDENTIAL_FIELDS.TRAVELPAYOUTS`,
`getTravelPayoutsClientForTenant`) — connect/rotate/disconnect from
Integrations → TravelPayouts, or import `TRAVELPAYOUTS_TOKEN` from the
environment as a starting point, identical UX to the other three
providers. `TravelPayoutsMapper` (`travelpayouts-mapper.ts`) is
deliberately tolerant: any record with an unexpected shape returns `null`
and is skipped rather than throwing, so one malformed upstream record
never fails an entire sync run.

**Honest limitation:** TravelPayouts/Hotellook's official documentation
domains (`support.travelpayouts.com`, `travelpayouts.github.io/slate`,
`travelpayouts-data-api.readthedocs.io`) all returned HTTP 403 from this
sandboxed environment (a WAF/Cloudflare block, not an auth failure) —
every fetch attempt is logged in this session's tool history. The client's
endpoint paths and field mappings were grounded instead in real
third-party Go client source (`liderman/go-hotellook-api`,
`awskii/hotellook`, read via raw GitHub content) and are marked as
best-effort in code comments. `fetchCountries`/`fetchLocations` (static
JSON endpoints) are the more confident of the three; `fetchHotelsForLocation`'s
exact path shape is the least certain. **This must be spike-verified
against a real TravelPayouts token before enabling in production** — the
mapper's defensive "skip on unexpected shape" behavior means a wrong
endpoint degrades to "zero hotels synced," not a crash, but it would still
under-deliver silently until verified.

### 2. Pure plan, impure engine

Mirrors the `reconciliation-plan.ts`/`reconciliation.ts` split from the
Booking Status Resolution Capability (§31):

- **`features/content-sync/lib/plan.ts`** — pure, I/O-free upsert
  decisions. `planCountryUpsert`/`planCityUpsert`/`planHotelUpsert`/
  `planDestinationUpsert` each compare an existing DB row (or `null`) to
  an incoming DTO and return `{ action: "create" | "update" | "skip",
  data }` — `"skip"` exists specifically so an unchanged record on a
  routine run doesn't trigger a write (and the `updatedAt` churn that
  comes with it). Fully unit-tested (13 tests) independent of any
  database.
- **`features/content-sync/lib/engine.ts`** — `runContentSync(db,
  tenantId, provider, options)`, the impure shell. Depends only on
  `ContentSyncProvider`, never a concrete client. For each requested
  dataset: fetch → for each record, load the current row → hand both to
  the matching `plan*Upsert` → apply the resulting create/update/skip.
  One bad record's error is caught, logged into the run's error list, and
  the loop continues — one dataset's failure never aborts another. Ends
  by writing one `ProviderSync` row for the whole run (status, records
  processed, first 20 errors truncated to 2000 chars) — the same
  monitoring table Hotelbeds/Duffel/Amadeus syncs already use.

### 3. Deduplication — never create a duplicate record

- **`Country`/`City`** already had real `@@unique([tenantId, code])`
  constraints — upserts key directly off that via `findUnique` +
  create/update.
- **`Hotel`/`Destination`** reuse the pre-existing `source`/`externalCode`
  pattern (`Hotel` already had it from the Hotelbeds sync; this sprint
  adds the identical `source ProviderType?` + `externalCode String?` +
  `@@index([tenantId, source, externalCode])` to `Destination`). Not a
  unique constraint — a non-unique index, deduplicated via `findFirst`,
  matching the existing Hotel convention exactly rather than introducing a
  second dedup strategy.
- **Images** (`HotelImage`/`DestinationImage`) — `fileKey` was widened
  from `String` to `String?` specifically so a sync-written image row
  (`fileKey: null`) is unambiguously distinguishable from a manual
  UploadThing upload (`fileKey` always a real key). Every sync run does
  `deleteMany({ hotelId, fileKey: null })` then recreates from the
  provider's current image list (capped at 20) — safe wholesale
  replacement that can never touch an agency's own uploaded photos.

### 4. Schema changes

One hand-written migration
(`prisma/migrations/20260717121840_add_travelpayouts_content_sync/`):
`ProviderType` gains `TRAVELPAYOUTS`; `hotel_images.fileKey` and
`destination_images.fileKey` become nullable; `destinations` gains
`source`/`externalCode` + a matching index; `tenant_settings` gains
`contentSyncSettings JSONB`. No table was dropped, renamed, or had a
column removed — purely additive.

### 5. Scheduler — self-rescheduling, no new cron

No separate queue or cron was added. `SYNC_CONTENT`
(`features/automation/handlers/sync-content.handler.ts`) is a `JobHandler`
registered into the existing Platform Automation Capability (§26) exactly
like `RECONCILE_SUPPLIER_ORDER`/`SEND_COMMUNICATION` — it rides the same
`Job`/`JobEvent` tables and the same `/api/jobs/process` cron tick (every
5 minutes, `vercel.json`).

What's new to this codebase is the *recurrence* pattern: a content sync
isn't "runs once, retries on failure," it's periodic. Every invocation —
success or failure — enqueues its own successor at `now +
intervalMinutes` (read from `contentSyncSettings` at the start of that
run), then returns its own outcome with `retryable: false` always. Two
deliberate consequences:

1. **The chain survives a bad run without operator intervention.** An
   expired token or a provider outage doesn't stop future attempts — the
   next one is already queued before this run even reports failure.
2. **Exactly one active successor job per tenant, never two competing
   schedules.** Because `retryable` is always `false`, the engine's own
   per-job backoff (`nextAvailableAt`, capped 30 min — designed for
   RECONCILE's "check again soon" cadence) never fires a second, parallel
   retry alongside the self-enqueued successor.

The only thing that stops the chain is `contentSyncSettings.enabled`
being `false` when a run starts — flipping it off in the UI lets the
in-flight successor run once more (reading the now-disabled setting) and
then stop rescheduling itself. Turning it back on re-seeds the chain by
enqueueing a fresh job if none is already pending.

Hotels are the one dataset large enough to need batching: the engine
processes at most `maxCitiesPerRun` (25) cities' hotel listings per
invocation and returns `nextCursorCityCode` — the self-reschedule payload
carries that cursor forward so consecutive runs march through every city
and wrap back to the start once exhausted, rather than only ever
covering the first 25 cities forever. Countries/cities/destinations are
small enough to fully resync every run, unwindowed.

A manual "Sync Now" (`triggerContentSyncNowAction`) enqueues a one-off run
with `force: true` in the payload — the handler runs it even while
`enabled` is `false`, but a forced run never starts recurrence itself.

### 6. Settings, actions, queries, UI

`contentSyncSettingsSchema` (`features/content-sync/schemas/`) —
`{ enabled, intervalMinutes (60–10,080), datasets }` — stored as
`TenantSettings.contentSyncSettings`, the same per-module `Json` column
convention as `crmSettings`/`pricingSettings`/etc. Kept as its own
dedicated action (`updateContentSyncSettingsAction`) rather than folded
into the generic `updateModuleSettingsAction` path, because enabling for
the first time has a side effect the generic path doesn't support:
seeding the first `SYNC_CONTENT` job if none is already queued.

`getContentSyncStatus` (`features/content-sync/queries/`) — one read
covering current settings, whether a run is already queued, the last 10
`ProviderSync` rows, and live counts of how many `Country`/`City`/
`Destination`/`Hotel` rows are attributed to `TRAVELPAYOUTS` today.
`ContentSyncPanel` (`features/content-sync/components/`) — a settings +
history panel at `/{tenantSlug}/integrations/content-sync`, reachable from
the Integrations dashboard's TravelPayouts card, mirroring the layout
conventions of the Hotelbeds/Amadeus explorer pages (dataset checkboxes,
Save Settings / Sync Now buttons, a sync-history table).

### 7. Verification — public site reads the local database only

Every page under `(marketing)`, `app/api/v1/public`, and `app/portal` was
grepped for any import of `features/integrations/lib/client-factory`,
`features/content-sync/providers/*`, or `providerRequest` — zero matches.
The marketing site (§27) has no hotel/destination catalog browsing at all
(it's static company/legal pages plus a `Plan`-catalog pricing page); the
customer portal (§29) only ever displays a customer's own already-made
booking, never live provider search. Neither surface called a provider
directly before this phase, and this phase adds nothing that would start.
Every dashboard page that *does* show hotel/destination content already
read `Hotel`/`Destination` from the tenant-scoped database — this phase
is what now keeps those tables current automatically rather than only
through the pre-existing manual/Hotelbeds-sync paths.

### 8. Gates

`npx tsc --noEmit` — clean. `npx eslint .` — zero errors (4 pre-existing
warnings in unrelated files, unchanged by this sprint). `npx vitest run`
— 336/336 passing (27 new: 13 `plan.test.ts`, 14
`travelpayouts-mapper.test.ts`). `npx next build` — succeeds, all 80+
routes compile including the new `/{tenantSlug}/integrations/content-sync`
page.

### 9. What Phase 1 deliberately does not do

- Does not touch `features/supplier-execution/`, any `*booking-prep*` or
  `*execution.action*` file, or `create-booking-dialog.tsx` — per this
  phase's explicit instruction, direct booking integration is untouched,
  not flag-gated. Flag-gating those modules (the eventual "leave disabled
  behind configuration flags" end state) would itself require editing
  those files, which this phase's own constraints forbid; it is a
  distinct, separately-scoped follow-up.
- Does not implement Booking.com/Expedia/any second `ContentSyncProvider`
  — the interface is built for it, but TravelPayouts is the only
  registered implementation today.
- Does not add a UI affordance for browsing the synchronized catalog on
  the public marketing site — that catalog-browsing *surface* doesn't
  exist yet in this codebase at all (see §7); this phase's scope was the
  synchronization engine and everything required to keep the local
  database current, not a new public-facing browsing experience.
