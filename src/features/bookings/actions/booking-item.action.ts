"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import type { ActionResult } from "@/shared/types/action-result";
import { bookingItemSchema, type BookingItemInput } from "@/features/bookings/schemas/booking.schema";
import { isTerminal } from "@/features/bookings/lib/status";
import { lineAmount } from "@/features/bookings/lib/totals";
import { recomputeBookingTotals } from "@/features/bookings/lib/recompute-totals";

/** Line items can only change while the booking is still open (not terminal). */
async function requireOpenBooking(
  db: Awaited<ReturnType<typeof requirePermission>>["db"],
  tenantId: string,
  bookingId: string,
): Promise<ActionResult<{ ok: true }>> {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId, deletedAt: null },
    select: { status: true },
  });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (isTerminal(booking.status)) {
    return { ok: false, error: "This booking is closed and its items can't be changed." };
  }
  return { ok: true, data: { ok: true } };
}

export async function addBookingItemAction(
  tenantId: string,
  bookingId: string,
  input: BookingItemInput,
): Promise<ActionResult<{ itemId: string }>> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = bookingItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item." };
  }

  const guard = await requireOpenBooking(db, tenantId, bookingId);
  if (!guard.ok) return guard;

  const last = await db.bookingItem.findFirst({
    where: { bookingId },
    select: { sortOrder: true },
    orderBy: { sortOrder: "desc" },
  });

  const item = await db.bookingItem.create({
    data: {
      tenantId,
      bookingId,
      type: parsed.data.type,
      description: parsed.data.description,
      referenceId: emptyToNull(parsed.data.referenceId),
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      amount: lineAmount(parsed.data.quantity, parsed.data.unitPrice),
      notes: emptyToNull(parsed.data.notes),
      supplierRateComments: emptyToNull(parsed.data.supplierRateComments),
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });

  await recomputeBookingTotals(db, tenantId, bookingId);
  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "ITEM_ADDED",
      title: `Added ${parsed.data.description}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "item_add",
    entity: "booking",
    entityId: bookingId,
    metadata: { itemId: item.id },
  });
  return { ok: true, data: { itemId: item.id } };
}

export async function updateBookingItemAction(
  tenantId: string,
  bookingId: string,
  itemId: string,
  input: BookingItemInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = bookingItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item." };
  }

  const guard = await requireOpenBooking(db, tenantId, bookingId);
  if (!guard.ok) return guard;

  const existing = await db.bookingItem.findFirst({
    where: { id: itemId, bookingId, tenantId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Item not found." };

  await db.bookingItem.update({
    where: { id: itemId },
    data: {
      type: parsed.data.type,
      description: parsed.data.description,
      referenceId: emptyToNull(parsed.data.referenceId),
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      amount: lineAmount(parsed.data.quantity, parsed.data.unitPrice),
      notes: emptyToNull(parsed.data.notes),
      supplierRateComments: emptyToNull(parsed.data.supplierRateComments),
    },
  });

  await recomputeBookingTotals(db, tenantId, bookingId);
  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "ITEM_UPDATED",
      title: `Updated ${parsed.data.description}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "item_update",
    entity: "booking",
    entityId: bookingId,
    metadata: { itemId },
  });
  return { ok: true };
}

export async function removeBookingItemAction(
  tenantId: string,
  bookingId: string,
  itemId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const guard = await requireOpenBooking(db, tenantId, bookingId);
  if (!guard.ok) return guard;

  const existing = await db.bookingItem.findFirst({
    where: { id: itemId, bookingId, tenantId },
    select: { description: true },
  });
  if (!existing) return { ok: false, error: "Item not found." };

  await db.bookingItem.delete({ where: { id: itemId } });

  await recomputeBookingTotals(db, tenantId, bookingId);
  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "ITEM_REMOVED",
      title: `Removed ${existing.description}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "item_remove",
    entity: "booking",
    entityId: bookingId,
    metadata: { itemId },
  });
  return { ok: true };
}
