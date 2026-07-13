import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";

import { prisma, getTenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { writePortalAudit } from "@/shared/lib/audit";
import { getClientIp } from "@/shared/lib/rate-limit";
import { isMagicLinkExpired } from "@/features/portal/lib/magic-link-token";
import { generateSessionToken, sessionExpiryDate } from "@/features/portal/lib/session-token";
import { setPortalSessionCookie } from "@/features/portal/lib/session-cookie";

/**
 * Exchanges a magic-link token for a portal session cookie, then redirects
 * into the dashboard. Single-use is enforced with the same atomic-claim
 * pattern `claimAndExecute` uses (`updateMany` gated on `consumedAt: null`,
 * checking `count === 1`) — a link opened twice (an email link-scanner
 * racing the real click is the common real-world case) must not mint two
 * sessions from one credential.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
): Promise<NextResponse> {
  const { tenantSlug } = await params;
  const token = request.nextUrl.searchParams.get("token");
  const invalidUrl = new URL(`/portal/${tenantSlug}/access?error=invalid_link`, request.url);

  if (!token) return NextResponse.redirect(invalidUrl);

  const magicLink = await prisma.portalMagicLink.findUnique({
    where: { token },
    select: {
      id: true,
      tenantId: true,
      customerId: true,
      expiresAt: true,
      consumedAt: true,
      tenant: { select: { slug: true } },
    },
  });

  // Every check below fails the same way (redirect to the generic
  // "invalid or expired" state) — wrong tenant, already used, and expired
  // are indistinguishable to the caller on purpose, same reasoning as the
  // no-enumeration response in requestPortalAccessAction. Still audited
  // when there's a real row to attribute it to (a wrong-tenant/expired/
  // reused attempt against a genuine link is a meaningful security signal,
  // even though the HTTP response never reveals which case it was).
  if (
    !magicLink ||
    magicLink.tenant.slug !== tenantSlug ||
    magicLink.consumedAt ||
    isMagicLinkExpired(magicLink.expiresAt)
  ) {
    if (magicLink) {
      await writePortalAudit(getTenantDb(magicLink.tenantId), {
        customerId: magicLink.customerId,
        action: "portal_verify_rejected",
        entityId: magicLink.id,
        metadata: {
          reason: magicLink.tenant.slug !== tenantSlug ? "wrong_tenant" : magicLink.consumedAt ? "already_used" : "expired",
        },
      }).catch(() => undefined);
    } else {
      logger.warn("portal: verify called with an unrecognized token");
    }
    return NextResponse.redirect(invalidUrl);
  }

  const claim = await prisma.portalMagicLink.updateMany({
    where: { id: magicLink.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (claim.count !== 1) return NextResponse.redirect(invalidUrl);

  const db = getTenantDb(magicLink.tenantId);
  const sessionToken = generateSessionToken();
  const sessionExpiresAt = sessionExpiryDate();
  const ip = await getClientIp();
  const userAgent = (await headers()).get("user-agent");

  const session = await db.portalSession.create({
    data: {
      tenantId: magicLink.tenantId,
      customerId: magicLink.customerId,
      token: sessionToken,
      expiresAt: sessionExpiresAt,
      createdIp: ip,
      userAgent,
    },
    select: { id: true },
  });

  await setPortalSessionCookie(sessionToken, sessionExpiresAt);
  await writePortalAudit(db, {
    customerId: magicLink.customerId,
    action: "portal_session_created",
    entityId: session.id,
    metadata: { magicLinkId: magicLink.id, ip },
  });
  logger.info("portal: session created", { tenantId: magicLink.tenantId, sessionId: session.id });

  return NextResponse.redirect(new URL(`/portal/${tenantSlug}/dashboard`, request.url));
}
