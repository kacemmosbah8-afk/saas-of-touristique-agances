import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { sendEmail } from "@/shared/lib/email";
import type { SendCommunicationInput, SendCommunicationResult } from "@/shared/lib/communications/types";

export type { SendCommunicationInput, SendCommunicationResult, CommunicationOwner } from "@/shared/lib/communications/types";

/**
 * The single entry point every feature calls to send a tracked outbound
 * message, on any channel. This is the Communication Capability's
 * orchestration layer — it sits one level above the pure, channel-only
 * `sendEmail()` (which knows nothing about tenants, owners, or persistence)
 * the same way `runIntegrationCall` sits above `providerRequest` for
 * supplier integrations: a tenant-aware wrapper around a pure I/O call, not
 * a reimplementation of either.
 *
 * Every call writes exactly one `CommunicationMessage` row — SENT, FAILED,
 * or SKIPPED — regardless of outcome, so "has this tenant's email been
 * working" is always answerable from one table instead of grepping through
 * N features' own activity timelines. This does NOT replace a feature's own
 * business-narrative timeline (e.g. BookingActivity) — callers that want a
 * human-readable "this confirmation was emailed" entry still write one; this
 * function is the complementary operational record.
 *
 * Only the EMAIL channel exists today; a future channel is added by
 * extending `CommunicationChannel` (one migration) and branching here — the
 * call sites and the message table do not change shape.
 */
export async function sendCommunication(
  db: TenantDb,
  input: SendCommunicationInput,
): Promise<SendCommunicationResult> {
  const result = await sendEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });

  await db.communicationMessage.create({
    data: {
      tenantId: input.tenantId,
      channel: "EMAIL",
      ownerType: input.owner.type,
      ownerId: input.owner.id,
      recipient: input.to,
      subject: input.subject,
      status: result.ok ? "SENT" : result.reason === "provider_error" ? "FAILED" : "SKIPPED",
      failureReason: result.ok ? null : result.reason,
      providerMessageId: result.ok ? (result.providerMessageId ?? null) : null,
      sentByUserId: input.sentByUserId ?? null,
    },
  });

  return result.ok ? { sent: true } : { sent: false, reason: result.reason };
}
