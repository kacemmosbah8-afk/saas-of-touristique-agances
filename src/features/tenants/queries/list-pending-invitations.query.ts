import "server-only";

import type { TenantDb } from "@/shared/lib/db";

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  createdAt: Date;
};

/** Invitations that haven't been accepted yet, newest first. */
export async function listPendingInvitations(db: TenantDb): Promise<PendingInvitation[]> {
  const invitations = await db.invitation.findMany({
    where: { acceptedAt: null },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return invitations;
}
