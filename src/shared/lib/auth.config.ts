import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config. This file must never import anything that
 * touches Prisma/Node APIs (the Prisma client, bcryptjs, ...) because it's
 * bundled into `middleware.ts`, which runs on the Edge runtime.
 *
 * `auth.ts` spreads this config and adds the providers + Prisma adapter,
 * which only ever run inside Node.js route handlers / Server Actions.
 */
export const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up"];

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

      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
