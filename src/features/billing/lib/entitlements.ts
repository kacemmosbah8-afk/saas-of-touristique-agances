import "server-only";

import type { TenantDb } from "@/shared/lib/db";

/** Pure — given a plan's feature list, does it grant `key`? */
export function hasFeature(plan: { features: string[] }, key: string): boolean {
  return plan.features.includes(key);
}

export type SeatLimitResult = {
  withinLimit: boolean;
  used: number;
  /** Null = unlimited. */
  limit: number | null;
};

/**
 * A seat is "used" by an active member OR a pending invitation — an
 * invitation reserves a seat the moment it's sent, so an OWNER can't send
 * more invites than seats allow only to have acceptance fail unpredictably
 * later. The single real consumer this sprint is `createInvitationAction`
 * (Communication Capability sprint) — this function is what proves the
 * capability generalizes, not a demonstration with no caller.
 */
export async function checkSeatLimit(db: TenantDb, tenantId: string): Promise<SeatLimitResult> {
  const subscription = await db.subscription.findUnique({
    where: { tenantId },
    select: { plan: { select: { seatLimit: true } } },
  });
  const limit = subscription?.plan.seatLimit ?? null;

  const [activeMembers, pendingInvites] = await Promise.all([
    db.membership.count({ where: { tenantId, status: "ACTIVE" } }),
    db.invitation.count({ where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  const used = activeMembers + pendingInvites;

  return { withinLimit: limit == null || used < limit, used, limit };
}
