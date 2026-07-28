import "server-only";
import { notFound } from "next/navigation";

import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/db";
import { getTenantDb } from "@/shared/lib/db";
import { can, type Action, type Resource } from "@/shared/lib/permissions/permissions";

export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "NO_TENANT_ACCESS" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Throws if there is no authenticated user. Use in Server Actions/Route Handlers. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new AuthError("UNAUTHENTICATED", "You must be signed in.");
  }
  return session;
}

/**
 * Throws unless the current user is an ACTIVE member of `tenantId`. Returns
 * the session plus the resolved membership (role) and a tenant-scoped
 * Prisma client.
 *
 * Deliberately queries the database rather than trusting
 * `session.memberships` (the JWT-cached claim list). That cache is only
 * refreshed on next sign-in or an explicit client-side `update()` call, so
 * it goes stale the instant a membership is created, its role changes, or
 * it's revoked — e.g. immediately after a user creates their first tenant,
 * before they've signed in again. An authorization boundary that can be
 * stale is a bug, not an optimization, so this hits the DB (one indexed
 * lookup on the `[tenantId, userId]` unique constraint) every time.
 * `session.memberships` is fine to use for non-authorization purposes
 * (e.g. a workspace switcher's display list).
 */
export async function requireTenantMembership(tenantId: string) {
  const session = await requireSession();

  const membership = await prisma.membership.findUnique({
    where: {
      tenantId_userId: { tenantId, userId: session.user.id },
      status: "ACTIVE",
    },
  });

  if (!membership) {
    throw new AuthError(
      "NO_TENANT_ACCESS",
      "You do not have access to this agency.",
    );
  }

  return {
    session,
    membership,
    db: getTenantDb(tenantId),
  };
}

/**
 * Throws unless the current user's role in `tenantId` grants `action` on
 * `resource`. This is the primary guard Server Actions in `features/*`
 * should call before performing a mutation.
 */
export async function requirePermission(
  tenantId: string,
  resource: Resource,
  action: Action,
) {
  const ctx = await requireTenantMembership(tenantId);

  if (!can(ctx.membership.role, resource, action)) {
    throw new AuthError(
      "FORBIDDEN",
      `Role ${ctx.membership.role} cannot ${action} ${resource}.`,
    );
  }

  return ctx;
}

/**
 * Same as `requireTenantMembership`, but for Server Components (pages,
 * layouts) rather than Server Actions. An unauthorized cross-tenant request
 * should render a plain 404 — not leak a 500/stack trace, and not confirm
 * whether the tenant exists — so this converts NO_TENANT_ACCESS into
 * Next's `notFound()` instead of letting AuthError bubble up uncaught.
 * Server Actions should keep using `requireTenantMembership` directly and
 * return a typed error result instead.
 */
export async function requireTenantMembershipOrNotFound(tenantId: string) {
  try {
    return await requireTenantMembership(tenantId);
  } catch (err) {
    if (err instanceof AuthError && err.code === "NO_TENANT_ACCESS") notFound();
    throw err;
  }
}

/** Server Component counterpart to `requirePermission` — see requireTenantMembershipOrNotFound. */
export async function requirePermissionOrNotFound(
  tenantId: string,
  resource: Resource,
  action: Action,
) {
  try {
    return await requirePermission(tenantId, resource, action);
  } catch (err) {
    if (
      err instanceof AuthError &&
      (err.code === "NO_TENANT_ACCESS" || err.code === "FORBIDDEN")
    ) {
      notFound();
    }
    throw err;
  }
}
