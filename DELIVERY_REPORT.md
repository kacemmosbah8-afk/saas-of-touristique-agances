# One One Tourism — Final Delivery Report

**Date:** 2026-07-26
**Scope:** Conversion of TravelOS from a multi-tenant SaaS codebase into a single-customer, commercially deliverable website for One One Tourism (Algeria).

---

## 1. Everything improved

- **Brand lock-in.** The real One One Tourism logo (`public/brand/logo.png`) now drives every visual surface: header, favicon, Apple touch icon, Open Graph share cards. Site-wide color palette (`src/app/globals.css`) rebuilt around the logo's royal blue (`#0033B0`) and gold/brass accent (`#C9A24A`), replacing the old terracotta placeholder theme.
- **Brand name corrected everywhere**, from the placeholder "One To One" to "One One Tourism": site config, legal pages, seed defaults, SEO metadata.
- **A real SEO bug fixed:** the site's `<meta keywords>` were still marketing *software to travel agencies* ("travel CRM", "tour operator software") — the leftover of TravelOS's SaaS-marketing era. Replaced with traveler-facing keywords in Arabic and French.
- **Plan My Trip data pipe fixed.** Visitor answers (destination, budget, travel period, travelers, style) were being silently folded into a `notes` text blob the admin Leads list never displayed. They're now real, structured columns — visible, and the Leads list can filter by source ("Plan My Trip" vs. "Website" contact-form leads).
- **A real display bug fixed:** a lead's phone number was fetched from the database but never rendered in the read-only lead summary view.
- **Algeria-departures bug fixed.** All four seeded flights had `departureCountry` set to Morocco (a copy/paste error) regardless of destination — corrected to Algeria on every route.
- **Marrakech → Tunis content swap completed.** The seed script's own comments flagged this as a known, never-finished fix (Algeria has no direct flights to Morocco); the destination, hotel, flight, package, and itinerary content is now genuinely about Tunis (Carthage, the Medina, Sidi Bou Said), in real authored Arabic and French.
- **Activities were never seeded** (zero rows) — four real activities added (Carthage/Bardo tour, Louvre tour, desert safari, Bosphorus cruise), each with bilingual copy, pricing, and a real photo.
- **More real photography wired in** for previously thin records: Dubai's hotel and destination now have gallery images beyond a single cover shot, sourced from photography already available rather than invented stock content.
- **Nav/category icons upgraded** from plain inline glyphs to a shared, on-brand "icon chip" treatment (soft-tinted rounded badge) used consistently in the admin sidebar and the homepage's Flights/Hotels/Activities columns.
- **Image format tuning:** AVIF/WebP negotiation added to `next.config.ts` (previously only remote-host allowlisting was configured).

## 2. Everything removed

- **Team management** (staff invites, member list, role assignment) — the whole `/invite/[token]` flow, its actions, queries, and components.
- **Workspace settings** (regional defaults, CRM/Lead/Supplier configuration toggles).
- **Tags, Categories, and Custom Fields** settings management (the underlying database tables are left in place, unused, rather than risking a destructive drop against data that couldn't be inspected first — see §12).
- **Logo upload and brand-color settings** — no longer admin-editable; the brand is fixed in code, as befits a custom-built, one-customer site.
- The admin Settings page is now a single screen: Public Website (tagline, description, contact info, hours, WhatsApp, social links, testimonials).

**Deliberately not removed:** the underlying `OWNER`/`ADMIN`/`AGENT`/`READ_ONLY` permission system. It's invisible infrastructure every action already calls through — ripping it out would have been a large, risky rewrite for zero visible benefit to a single logged-in owner.

**Investigated and found not to be ours:** the "two floating circular elements, palm tree and black N icon" described in the original brief do not exist anywhere in this codebase (exhaustively searched). The most likely explanation is a browser extension overlay — this machine has X-VPN installed, and that class of extension commonly injects floating badges on every page. No code change results from this.

## 3. Final architecture

Unchanged at the structural level — still the modular monolith described in `PROJECT.md` (Next.js 15 App Router, Prisma/Postgres, feature-first `src/features/*`). What changed is scope, not shape:

- `app/` — routing only. `(marketing)` now serves only the four legal pages; `(tenant)/[tenantSlug]/(public)` is the real storefront; `(tenant)/[tenantSlug]/admin` is the single-owner dashboard.
- `shared/components/brand/` — `logo.tsx` (fixed asset) and the new `icon-chip.tsx`.
- `public/brand/logo.png`, `src/app/icon.png`, `src/app/apple-icon.png` — static brand assets (Next.js's file-convention icons, no longer server-generated per request).
- One new migration: `prisma/migrations/20260726001434_add_plan_trip_lead_fields_and_sync_drift` — adds `Lead.tripDestination/tripTravelers/tripPeriod/tripStyle` and the `PLAN_MY_TRIP` lead source, and also reconciles pre-existing schema drift from the earlier, already-decided Duffel/supplier-order-execution removal (see `PROJECT.md`) that had never been migrated in this dev database.

## 4. How to deploy

1. Provision a production Postgres database (Neon recommended — see `README.md`).
2. Set environment variables on your host (Vercel is already configured — `vercel.json` has the job-queue cron): `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (`npx auth secret`), `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `"One One Tourism <noreply@yourdomain.com>"`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `SITE_URL`, `SUPPORT_EMAIL`, `COMPANY_LEGAL_NAME`, `COMPANY_ADDRESS`.
3. `npx prisma migrate deploy` — applies all 35 migrations to the fresh database.
4. `npx prisma db seed` — bootstraps the one owner account and tenant (see §8 for credentials).
5. **Optional:** `node --env-file=.env scripts/seed-showcase-content.mjs` — loads demo content (Tunis/Paris/Dubai/Istanbul packages) so the site isn't empty on day one. **This is placeholder demo content, not One One Tourism's real offerings** — replace it via the admin Packages/Hotels/Flights/Activities/Destinations pages before real customers arrive (see §9).
6. `npm run build && npm run start`, or deploy the repo to Vercel directly.

## 5. How to connect the purchased domain

1. Buy the domain (any registrar).
2. In your hosting provider (Vercel), add the domain to the project and follow its DNS instructions (typically an `A`/`ALIAS` record at the apex plus a `CNAME` for `www`).
3. Update `SITE_URL` (and `AUTH_URL` if set separately) to the real domain, redeploy.
4. Once DNS propagates and the domain is verified, the root domain will auto-redirect to `/one-one-tourism` (the single-tenant root-redirect behavior, verified working).
5. Verify the sending domain in Resend and point `EMAIL_FROM` at an address on the new domain so booking/lead emails don't get flagged as spam.

## 6. How to access the public website

`https://<your-domain>/one-one-tourism` (or, before a domain is connected, `https://<vercel-project>.vercel.app/one-one-tourism`). The bare root domain auto-redirects here.

## 7. How to access the admin panel

`https://<your-domain>/one-one-tourism/admin` — redirects to sign-in if not logged in.

## 8. Default administrator credentials

Created by `npx prisma db seed` (already applied to the local dev database this session):

```
Email:    owner@oneonetourism.local
Password: change-this-password
```

**Change this password immediately after first sign-in** (there's no in-app "change password" screen yet on this build — update it directly via the database, or ask for this to be added, until real password-reset/change flows are built). Override the defaults at seed time with `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` / `SEED_OWNER_NAME` environment variables if you'd rather never have the placeholder password touch production.

## 9. What the agency owner must configure after receiving the project

- [ ] Change the admin password (see §8).
- [ ] Settings → Public Website: tagline, description, contact email/phone/WhatsApp, business hours, address, social links, and real client testimonials.
- [ ] Replace every demo Package/Hotel/Flight/Activity/Destination with real offerings and real photography — the seeded Tunis/Paris/Dubai/Istanbul content exists to prove the platform works, not to represent your actual catalog.
- [ ] Verify a sending domain in Resend and set `EMAIL_FROM` so booking/lead notification emails deliver reliably.
- [ ] Decide whether French should stay enabled on the public site (toggle in Settings — Arabic is primary either way).

## 10. Go-live checklist

- [ ] Production Postgres provisioned, migrations applied (`prisma migrate deploy`), owner seeded.
- [ ] Domain purchased and connected (§5); `SITE_URL` updated; HTTPS active.
- [ ] Admin password changed from the seed default.
- [ ] Real catalog content entered; demo content removed or replaced.
- [ ] Resend sending domain verified; test a booking request and a Plan My Trip submission end-to-end and confirm the email/lead actually arrives.
- [ ] Contact info, hours, and socials filled in on the Public Website settings page.
- [ ] Confirm the WhatsApp number is correct — it's a real inbound channel on this site.
- [ ] Optional: replace the login-flow's known corner-case (an already-unreachable-in-practice uncaught error on a session check inside the admin layout, see `PROJECT.md`/audit notes) if you ever restructure middleware routing.

## 11. Handover guide for One One Tourism

- **Daily use:** log into `/one-one-tourism/admin` to manage Packages, Flights, Hotels, Activities, Destinations, Leads, and Booking Requests. Leads arriving from the "Plan My Trip" quiz are labeled and show the visitor's destination/budget/travelers/style directly — no digging through notes.
- **The public site is the whole storefront** — nothing on it is hardcoded to require the admin; an empty settings field simply doesn't render on the public side.
- **One login only, by design** — this is a single-owner product now. If a second staff account is ever needed, that's a documented future addition, not something available today (see §12).
- **The brand (logo, colors, name) is fixed in the code**, not a settings-page option — this was a deliberate simplification for a custom-built, one-customer site. Changing it in the future means asking a developer to update `public/brand/logo.png`, `src/app/globals.css`, and re-deploy — not a self-service admin action.

## 12. Optional future improvements (not part of this delivery)

- A self-service "change my password" screen for the admin account.
- Re-adding a second staff login (Team/invite feature) if the agency ever needs more than one person in the dashboard — the underlying permission system already supports it; only the invite UI was removed.
- Dropping the now-unused `Tag`/`TravelCategory`/`CustomField` database tables outright (currently left in place, just without any admin UI, since a live destructive migration wasn't something to do without the agency's sign-off).
- Applying the row-level-security policies already drafted in `prisma/sql/001_row_level_security.sql` (documented in `README.md` as intentionally not yet applied).
- Real, licensed photography for every package/hotel/activity, replacing the showcase demo images.
- A genuine visual/UX walkthrough in a real browser once this is deployed somewhere reachable by browser automation tooling (this session's Phase E was verified via direct HTTP/database checks — login → dashboard → logout → public site, Plan My Trip data flow, and every public route were all confirmed working end-to-end, but not eyeballed pixel-by-pixel in a live browser).
