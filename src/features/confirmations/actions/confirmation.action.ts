"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import type { ActionResult } from "@/shared/types/action-result";
import {
  requestConfirmationSchema,
  confirmConfirmationSchema,
  rejectConfirmationSchema,
  type RequestConfirmationInput,
  type ConfirmConfirmationInput,
  type RejectConfirmationInput,
} from "@/features/confirmations/schemas/confirmation.schema";

/**
 * Supplier confirmations track whether the supplier behind each booking line
 * has confirmed the service. One record per line; re-requesting resets a
 * rejected record to PENDING (the history stays in the booking timeline).
 */

export async function requestConfirmationAction(
  tenantId: string,
  bookingId: string,
  bookingItemId: string,
  input: RequestConfirmationInput,
): Promise<ActionResult<{ confirmationId: string }>> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = requestConfirmationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const item = await db.bookingItem.findFirst({
    where: { id: bookingItemId, bookingId, tenantId },
    select: {
      description: true,
      booking: { select: { status: true, deletedAt: true } },
      confirmation: { select: { id: true, status: true } },
    },
  });
  if (!item || item.booking.deletedAt) return { ok: false, error: "Booking line not found." };
  if (item.booking.status === "CANCELLED") {
    return { ok: false, error: "A cancelled booking's lines can't be confirmed." };
  }

  const supplierName = emptyToNull(parsed.data.supplierName);
  const notes = emptyToNull(parsed.data.notes);

  let confirmationId: string;
  if (item.confirmation) {
    if (item.confirmation.status === "CONFIRMED") {
      return { ok: false, error: "This line is already confirmed." };
    }
    // Re-request: reset a pending/rejected record.
    await db.supplierConfirmation.update({
      where: { id: item.confirmation.id, tenantId },
      data: {
        status: "PENDING",
        supplierName,
        confirmationNumber: null,
        requestedAt: new Date(),
        respondedAt: null,
        notes,
        createdBy: session.user.id,
      },
    });
    confirmationId = item.confirmation.id;
  } else {
    const created = await db.supplierConfirmation.create({
      data: {
        tenantId,
        bookingId,
        bookingItemId,
        supplierName,
        notes,
        createdBy: session.user.id,
      },
      select: { id: true },
    });
    confirmationId = created.id;
  }

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "UPDATED",
      title: `Confirmation requested: ${item.description}`,
      description: supplierName ? `Supplier: ${supplierName}` : null,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "confirmation_request",
    entity: "booking",
    entityId: bookingId,
    metadata: { bookingItemId, confirmationId },
  });
  logger.info("supplier confirmation requested", { tenantId, bookingId, bookingItemId });
  return { ok: true, data: { confirmationId } };
}

export async function confirmSupplierConfirmationAction(
  tenantId: string,
  confirmationId: string,
  input: ConfirmConfirmationInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = confirmConfirmationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const confirmation = await db.supplierConfirmation.findFirst({
    where: { id: confirmationId, tenantId },
    select: { status: true, bookingId: true, item: { select: { description: true } } },
  });
  if (!confirmation) return { ok: false, error: "Confirmation not found." };
  if (confirmation.status === "CONFIRMED") return { ok: true };

  await db.supplierConfirmation.update({
    where: { id: confirmationId, tenantId },
    data: {
      status: "CONFIRMED",
      confirmationNumber: parsed.data.confirmationNumber,
      respondedAt: new Date(),
      notes: emptyToNull(parsed.data.notes),
    },
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId: confirmation.bookingId,
      userId: session.user.id,
      type: "UPDATED",
      title: `Supplier confirmed: ${confirmation.item.description}`,
      description: `Confirmation #${parsed.data.confirmationNumber}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "confirmation_confirm",
    entity: "booking",
    entityId: confirmation.bookingId,
    metadata: { confirmationId, confirmationNumber: parsed.data.confirmationNumber },
  });
  logger.info("supplier confirmation confirmed", { tenantId, confirmationId });
  return { ok: true };
}

export async function rejectSupplierConfirmationAction(
  tenantId: string,
  confirmationId: string,
  input: RejectConfirmationInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = rejectConfirmationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const confirmation = await db.supplierConfirmation.findFirst({
    where: { id: confirmationId, tenantId },
    select: { status: true, bookingId: true, item: { select: { description: true } } },
  });
  if (!confirmation) return { ok: false, error: "Confirmation not found." };
  if (confirmation.status === "REJECTED") return { ok: true };

  await db.supplierConfirmation.update({
    where: { id: confirmationId, tenantId },
    data: {
      status: "REJECTED",
      respondedAt: new Date(),
      notes: emptyToNull(parsed.data.notes),
    },
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId: confirmation.bookingId,
      userId: session.user.id,
      type: "UPDATED",
      title: `Supplier rejected: ${confirmation.item.description}`,
      description: emptyToNull(parsed.data.notes),
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "confirmation_reject",
    entity: "booking",
    entityId: confirmation.bookingId,
    metadata: { confirmationId },
  });
  logger.info("supplier confirmation rejected", { tenantId, confirmationId });
  return { ok: true };
}
