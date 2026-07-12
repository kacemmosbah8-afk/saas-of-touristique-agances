import "server-only";

import { prisma } from "@/shared/lib/db";
import { isInvitationExpired } from "@/features/tenants/lib/invitation-token";

export type InvitationLookup = {
  id: string;
  email: string;
  role: string;
  tenantName: string;
  tenantSlug: string;
  expired: boolean;
  accepted: boolean;
};

/**
 * Looks up an invitation by its bearer token — deliberately not
 * tenant-scoped (there is no tenant context until the token itself is
 * resolved), matching `acceptInvitationAction`'s trust model. Used by the
 * `/invite/[token]` page to render the right state before anyone signs in.
 */
export async function getInvitationByToken(token: string): Promise<InvitationLookup | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      tenant: { select: { name: true, slug: true } },
    },
  });
  if (!invitation) return null;

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    tenantName: invitation.tenant.name,
    tenantSlug: invitation.tenant.slug,
    expired: isInvitationExpired(invitation.expiresAt),
    accepted: invitation.acceptedAt != null,
  };
}
