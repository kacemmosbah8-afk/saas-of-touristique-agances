import "server-only";

import type { CommunicationChannel, CommunicationStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type PortalCommunicationEntry = {
  id: string;
  channel: CommunicationChannel;
  subject: string | null;
  status: CommunicationStatus;
  sentAt: Date;
};

/**
 * Messages the agency sent this traveler, reusing the Communication
 * Capability's own `CommunicationMessage` table rather than a portal-
 * specific log. `CommunicationMessage` has no direct `customerId` — it's
 * polymorphic by `ownerType`/`ownerId` (booking, invitation, supplier
 * order, …) — so this matches by `recipient` email instead, which is what
 * the traveler actually received. Portal sign-in emails
 * (`ownerType: "portal_magic_link"`) are deliberately excluded: those are
 * system auth mail, not an agency message, and would just be login-link
 * noise in what's meant to read as "updates about your trip."
 *
 * Known limitation: if two different `Customer` rows in the same tenant
 * share an email address (a real but unusual data situation — e.g. a
 * family sharing one inbox, entered as separate customer records), this
 * shows both customers' mail to that address. Narrower would require
 * `CommunicationMessage` to carry a `customerId`, which is a schema change
 * out of scope for this sprint — see PROJECT.md, "Customer Portal
 * Capability".
 */
export async function listPortalCommunications(
  db: TenantDb,
  tenantId: string,
  customerId: string,
): Promise<PortalCommunicationEntry[]> {
  const customer = await db.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { email: true },
  });
  if (!customer?.email) return [];

  const messages = await db.communicationMessage.findMany({
    where: {
      tenantId,
      recipient: { equals: customer.email, mode: "insensitive" },
      ownerType: { not: "portal_magic_link" },
    },
    select: { id: true, channel: true, subject: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return messages.map((m) => ({
    id: m.id,
    channel: m.channel,
    subject: m.subject,
    status: m.status,
    sentAt: m.createdAt,
  }));
}
