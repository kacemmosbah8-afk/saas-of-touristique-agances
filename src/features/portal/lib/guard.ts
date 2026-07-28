import "server-only";
import { redirect } from "next/navigation";

import { prisma, getTenantDb, type TenantDb } from "@/shared/lib/db";
import { isSessionExpired } from "@/features/portal/lib/session-token";
import { getPortalSessionCookie, clearPortalSessionCookie } from "@/features/portal/lib/session-cookie";
import { writePortalAudit } from "@/shared/lib/audit";

export type PortalContext = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  customerId: string;
  sessionId: string;
  db: TenantDb;
};

/**
 * Resolves the portal session cookie into a tenant+customer context, or
 * `null` if there isn't a valid one. Deliberately reads the session via the
 * raw `prisma` client keyed by the bearer `token` (there is no tenant to
 * scope by yet — same reasoning `acceptInvitationAction` documents), then
 * cross-checks the session's own `tenantId` against the tenant resolved
 * from the URL's `tenantSlug` before returning anything.
 *
 * That cross-check is the load-bearing line for cross-tenant protection:
 * the session cookie's path is `/portal` (not `/portal/[tenantSlug]`), so
 * the *same* cookie is technically sent by the browser on every tenant's
 * portal URL. Without this check, a traveler signed into Tenant A's portal
 * who is sent (or navigates to) Tenant B's portal URL would silently see
 * Tenant A's data rendered under Tenant B's branding — a real cross-tenant
 * leak, not a hypothetical one. Rejecting a mismatched session outright
 * (never "falling back" to the URL's tenant) is what closes it.
 */
export async function resolvePortalSession(tenantSlug: string): Promise<PortalContext | null> {
  const token = await getPortalSessionCookie();
  if (!token) return null;

  const session = await prisma.portalSession.findUnique({
    where: { token },
    select: {
      id: true,
      tenantId: true,
      customerId: true,
      expiresAt: true,
      revokedAt: true,
      tenant: { select: { slug: true, name: true } },
    },
  });

  if (!session || session.revokedAt || isSessionExpired(session.expiresAt)) return null;
  if (session.tenant.slug !== tenantSlug) return null;

  // Best-effort activity heartbeat — never blocks the request on failure.
  prisma.portalSession
    .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);

  return {
    tenantId: session.tenantId,
    tenantSlug: session.tenant.slug,
    tenantName: session.tenant.name,
    customerId: session.customerId,
    sessionId: session.id,
    db: getTenantDb(session.tenantId),
  };
}

/**
 * Server Component guard: resolves the session or redirects to the
 * tenant's portal sign-in page. Every portal page route should start with
 * this — it is the single authorization boundary the rest of the portal's
 * queries/actions trust.
 */
export async function requirePortalSession(tenantSlug: string): Promise<PortalContext> {
  const ctx = await resolvePortalSession(tenantSlug);
  if (!ctx) redirect(`/portal/${tenantSlug}/access`);
  return ctx;
}

/** Revokes the current session (if any) and clears the cookie — "sign out." */
export async function endPortalSession(): Promise<void> {
  const token = await getPortalSessionCookie();
  if (token) {
    const revoked = await prisma.portalSession
      .update({
        where: { token },
        data: { revokedAt: new Date() },
        select: { id: true, tenantId: true, customerId: true },
      })
      .catch(() => null);
    if (revoked) {
      await writePortalAudit(getTenantDb(revoked.tenantId), {
        customerId: revoked.customerId,
        action: "portal_sign_out",
        entityId: revoked.id,
      }).catch(() => undefined);
    }
  }
  await clearPortalSessionCookie();
}
