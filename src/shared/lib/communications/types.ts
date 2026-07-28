/**
 * The Communication Capability's own DTO — deliberately independent of the
 * Prisma-generated `CommunicationMessage` type so this module's public
 * surface doesn't leak the ORM shape to callers (same discipline as the
 * integrations layer's DTOs).
 */

export type CommunicationOwner = {
  /** e.g. "booking", "invitation" — a short, stable, lowercase noun. */
  type: string;
  id: string;
};

export type SendCommunicationInput = {
  tenantId: string;
  owner: CommunicationOwner;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** userId of whoever triggered this send; omit for system-triggered sends. */
  sentByUserId?: string;
};

export type SendCommunicationResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "no_recipient" | "provider_error" };
