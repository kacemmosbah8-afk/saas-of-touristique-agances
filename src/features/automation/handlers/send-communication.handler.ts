import "server-only";
import { z } from "zod";

import { getTenantDb } from "@/shared/lib/db";
import { sendCommunication } from "@/shared/lib/communications";
import type { JobHandler, JobHandlerResult, JobContext } from "@/features/automation/lib/types";
import { registerJobHandler } from "@/features/automation/lib/registry";

export const SEND_COMMUNICATION_JOB_TYPE = "SEND_COMMUNICATION";

/**
 * A job's payload round-trips through a JSONB column, so it's validated
 * here on the way out rather than trusted via a cast — the same discipline
 * every DTO boundary in this codebase applies. A malformed payload is
 * classified non-retryable: retrying will produce the exact same parse
 * failure every time.
 */
const payloadSchema = z.object({
  tenantId: z.string().min(1),
  owner: z.object({ type: z.string().min(1), id: z.string().min(1) }),
  to: z.string().min(1),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  replyTo: z.string().optional(),
  sentByUserId: z.string().optional(),
});

export type SendCommunicationJobPayload = z.infer<typeof payloadSchema>;

/**
 * The job automation engine's first real handler — a genuine, in-scope
 * consumer, not a demo. Calls the exact same `sendCommunication()` every
 * other feature already uses, so a job-dispatched send writes the identical
 * `CommunicationMessage` row a synchronous one would — this handler adds
 * durability and retry, not a second send path.
 */
async function handle(payload: unknown, context: JobContext): Promise<JobHandlerResult> {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, retryable: false, message: `Invalid SEND_COMMUNICATION payload: ${parsed.error.issues[0]?.message ?? "unknown error"}.` };
  }

  const tenantId = context.tenantId ?? parsed.data.tenantId;
  const db = getTenantDb(tenantId);
  const result = await sendCommunication(db, parsed.data);

  if (result.sent) return { ok: true };

  // "not_configured"/"no_recipient" won't resolve by retrying; a transient
  // provider error might. Mirrors classifyExecutionFailure's reasoning in
  // the Supplier Order Execution Capability.
  return {
    ok: false,
    retryable: result.reason === "provider_error",
    message: `Email send failed: ${result.reason}.`,
  };
}

export const sendCommunicationJobHandler: JobHandler = {
  type: SEND_COMMUNICATION_JOB_TYPE,
  handle,
};

registerJobHandler(sendCommunicationJobHandler);
