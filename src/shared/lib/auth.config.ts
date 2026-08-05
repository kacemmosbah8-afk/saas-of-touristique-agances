import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config. This file must never import anything that
 * touches Prisma/Node APIs (the Prisma client, bcryptjs, ...) because it's
 * bundled into `middleware.ts`, which runs on the Edge runtime.
 *
 * `auth.ts` spreads this config and adds the providers + Prisma adapter,
 * which only ever run inside Node.js route handlers / Server Actions.
 */
/**
 * This deployment's default surface is public: the agency's own customer
 * website at `/<tenantSlug>/...` (browsable by anyone, no session) and
 * TravelOS's own marketing/legal/auth pages. Staff-only surfaces are the
 * exception, not the rule, so this gate is deny-by-exception rather than
 * the allow-by-exception list it used to be — everything falls through to
 * `return true` in `authorized()` below unless it matches one of the two
 * protected sets declared here.
 */

/**
 * Exact paths that always require a signed-in session, regardless of
 * tenant slug.
 */
export const PROTECTED_EXACT_ROUTES = [
  // First-run setup: creates the one tenant this deployment is licensed to
  // (see createTenantAction's single-tenant-per-deployment guard). Must not
  // be reachable by an anonymous visitor of the agency's public site.
  "/onboarding",
];

/**
 * Matches `/<tenantSlug>/admin` and everything nested under it — the staff
 * administration panel. The tenant slug segment is dynamic (this
 * deployment is licensed to exactly one agency, but its slug isn't known
 * statically here), so this is a structural pattern match rather than a
 * fixed-string list. Every other path under `/<tenantSlug>/...` — the bare
 * slug itself and any non-`admin` sub-path — is the public storefront and
 * stays open to anonymous visitors; the admin layout at
 * `(tenant)/[tenantSlug]/admin/layout.tsx` does the authoritative,
 * fresh-from-the-database tenant-membership check once past this gate.
 */
function isAdminRoute(pathname: string): boolean {
  return /^\/[^/]+\/admin(\/.*)?$/.test(pathname);
}

export const authConfig = {
  trustHost: true,
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
     * does NOT gate admin routes on tenant-slug membership itself.
     * Membership is cached in the JWT (`auth.memberships`) for display
     * purposes, but that cache is only refreshed on next sign-in and goes
     * stale the instant a membership is created/changed/revoked (e.g.
     * right after a user creates their first tenant). Gating access here
     * on that stale cache produced exactly that bug during M0 development:
     * a brand-new tenant was unreachable until the next full sign-in. The
     * authoritative, always-fresh check is `requireTenantMembership()`
     * (src/shared/lib/permissions/guard.ts), which the admin layout calls
     * against the database. This callback is a coarse, cheap "logged in at
     * all" gate at the edge — the real authorization boundary is
     * server-side.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (PROTECTED_EXACT_ROUTES.includes(pathname)) return !!auth?.user;
      if (isAdminRoute(pathname)) return !!auth?.user;

      return true;
    },
  },
} satisfies NextAuthConfig;
