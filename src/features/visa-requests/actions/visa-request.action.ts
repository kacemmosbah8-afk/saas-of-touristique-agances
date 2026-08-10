"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import type { ActionResult } from "@/shared/types/action-result";
import {
  updateVisaRequestStatusSchema,
  addVisaRequestNoteSchema,
  type UpdateVisaRequestStatusInput,
  type AddVisaRequestNoteInput,
} from "@/features/visa-requests/schemas/visa-request.schema";
import { canTransition, VISA_REQUEST_STATUS_LABELS } from "@/features/visa-requests/lib/status";

/** Change a visa request's status by hand. Mirrors `booking-requests`' `updateBookingRequestStatusAction`. */
export async function updateVisaRequestStatusAction(
  tenantId: string,
  visaRequestId: string,
  input: UpdateVisaRequestStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "visaRequest", "update");

  const parsed = updateVisaRequestStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const request = await db.visaRequest.findFirst({
    where: { id: visaRequestId, tenantId },
    select: { status: true },
  });
  if (!request) return { ok: false, error: "Visa request not found." };
  if (request.status === parsed.data.status) return { ok: true };

  if (!canTransition(request.status, parsed.data.status)) {
    return {
      ok: false,
      error: `Cannot move a ${VISA_REQUEST_STATUS_LABELS[request.status]} request to ${VISA_REQUEST_STATUS_LABELS[parsed.data.status]}.`,
    };
  }

  await db.visaRequest.update({
    where: { id: visaRequestId, tenantId },
    data: {
      status: parsed.data.status,
      contactedAt: parsed.data.status === "CONTACTED" ? new Date() : undefined,
      approvedAt: parsed.data.status === "APPROVED" ? new Date() : undefined,
      rejectedAt: parsed.data.status === "REJECTED" ? new Date() : undefined,
      rejectReason: parsed.data.status === "REJECTED" ? parsed.data.reason || null : undefined,
      cancelledAt: parsed.data.status === "CANCELLED" ? new Date() : undefined,
      cancelReason: parsed.data.status === "CANCELLED" ? parsed.data.reason || null : undefined,
    },
  });

  await db.visaRequestActivity.create({
    data: {
      tenantId,
      visaRequestId,
      userId: session.user.id,
      type: "STATUS_CHANGED",
      title: `Status changed to ${VISA_REQUEST_STATUS_LABELS[parsed.data.status]}`,
      description: parsed.data.reason || null,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "status_change",
    entity: "visa_request",
    entityId: visaRequestId,
    metadata: { status: parsed.data.status },
  });
  logger.info("visa request status changed", { tenantId, visaRequestId, status: parsed.data.status });
  return { ok: true };
}

/** Log an internal note against a visa request's activity timeline. */
export async function addVisaRequestNoteAction(
  tenantId: string,
  visaRequestId: string,
  input: AddVisaRequestNoteInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "visaRequest", "update");

  const parsed = addVisaRequestNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }

  const request = await db.visaRequest.findFirst({
    where: { id: visaRequestId, tenantId },
    select: { id: true },
  });
  if (!request) return { ok: false, error: "Visa request not found." };

  await db.visaRequestActivity.create({
    data: {
      tenantId,
      visaRequestId,
      userId: session.user.id,
      type: "NOTE_ADDED",
      title: "Note added",
      description: parsed.data.note,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "note",
    entity: "visa_request",
    entityId: visaRequestId,
  });
  logger.info("visa request note added", { tenantId, visaRequestId });
  return { ok: true };
}
