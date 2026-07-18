import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config. This file must never import anything that
 * touches Prisma/Node APIs (the Prisma client, bcryptjs, ...) because it's
 * bundled into `middleware.ts`, which runs on the Edge runtime.
 *
 * `auth.ts` spreads this config and adds the providers + Prisma adapter,
 * which only ever run inside Node.js route handlers / Server Actions.
 */
export const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  // Public marketing & legal pages — see PROJECT.md, "Public Website &
  // Verification Readiness". Missing one here doesn't 404 it; the
  // middleware's default-deny redirects it to sign-in instead, which is
  // exactly how the initial version of this sprint's pages were caught
  // being invisible to search engines and payment-provider verification.
  "/features",
  "/solutions",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/cookie-policy",
  // Next.js-generated metadata routes — a crawler that can't fetch these
  // unauthenticated can't index the site at all.
  "/robots.txt",
  "/sitemap.xml",
  "/icon",
  "/opengraph-image",
];

/**
 * Path prefixes that are public regardless of auth state — for routes with
 * a dynamic segment that can't be listed in `PUBLIC_ROUTES` (an exact-match
 * list). `/invite/[token]` must be reachable both signed out (it renders
 * sign-in/sign-up inline) and signed in (it renders the accept step) — the
 * page itself, not the middleware, decides what to show.
 *
 * `/portal/` is the entire Customer Portal — travelers have no Auth.js
 * session at all (a `Customer` has no `User`/`Membership` row anywhere in
 * this schema; see `features/portal/lib/guard.ts`). Without this prefix,
 * this middleware's default-deny `authorized()` callback below would
 * redirect every portal request to staff `/sign-in`, making the whole
 * portal unreachable — the exact bug class PROJECT.md's "Public Website &
 * Verification Readiness" sprint already caught once for the marketing
 * pages. The portal enforces its own, separate authorization boundary
 * (`requirePortalSession`) inside its own routes.
 */
export const PUBLIC_ROUTE_PREFIXES = ["/invite/", "/portal/"];

export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    /**
     * Middleware only checks "is there a logged-in user" — it deliberately
     * does NOT gate on tenant-slug membership. Membership is cached in the
     * JWT (`auth.memberships`) for display purposes, but that cache is only
     * refreshed on next sign-in and goes stale the instant a membership is
     * created/changed/revoked (e.g. right after a user creates their first
     * tenant). Gating access here on that stale cache produced exactly that
     * bug during M0 development: a brand-new tenant was unreachable until
     * the next full sign-in. The authoritative, always-fresh check is
     * `requireTenantMembership()` (src/shared/lib/permissions/guard.ts),
     * which every tenant route's layout calls against the database. This
     * callback is a coarse, cheap "logged in at all" gate at the edge —
     * the real authorization boundary is server-side.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (PUBLIC_ROUTES.includes(pathname)) return true;
      if (PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;

      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
