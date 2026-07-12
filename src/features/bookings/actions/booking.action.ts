"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import type { ActionResult } from "@/shared/types/action-result";
import {
  bookingFormSchema,
  updateBookingStatusSchema,
  cancelBookingSchema,
  assignBookingSchema,
  type BookingFormInput,
  type UpdateBookingStatusInput,
  type CancelBookingInput,
  type AssignBookingInput,
} from "@/features/bookings/schemas/booking.schema";
import { canTransition, BOOKING_STATUS_LABELS } from "@/features/bookings/lib/status";
import { formatBookingReference } from "@/features/bookings/lib/reference";
import { computeTotals } from "@/features/bookings/lib/totals";
import { recomputeBookingTotals } from "@/features/bookings/lib/recompute-totals";

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function headerData(d: BookingFormInput) {
  return {
    packageId: emptyToNull(d.packageId),
    ownerId: emptyToNull(d.ownerId),
    travelStartDate: parseDate(d.travelStartDate || undefined),
    travelEndDate: parseDate(d.travelEndDate || undefined),
    adults: d.adults,
    children: d.children,
    currency: d.currency,
    discount: d.discount ?? 0,
    tax: d.tax ?? 0,
    notes: emptyToNull(d.notes),
    internalNotes: emptyToNull(d.internalNotes),
  };
}

/**
 * Allocate the next per-tenant reference. The sequence is the count of existing
 * bookings for the tenant in the current year + 1; the DB's
 * `@@unique([tenantId, reference])` is the final guard if two requests race.
 */
async function nextReference(
  db: Awaited<ReturnType<typeof requirePermission>>["db"],
  tenantId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await db.booking.count({
    where: { tenantId, createdAt: { gte: start, lt: end } },
  });
  return formatBookingReference(year, count + 1);
}

export async function createBookingAction(
  tenantId: string,
  input: BookingFormInput,
): Promise<ActionResult<{ bookingId: string }>> {
  const { session, db } = await requirePermission(tenantId, "booking", "create");

  const parsed = bookingFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Customer must belong to this tenant.
  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return { ok: false, error: "Customer not found." };

  const data = headerData(parsed.data);
  if (data.packageId) {
    const pkg = await db.package.findFirst({
      where: { id: data.packageId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!pkg) return { ok: false, error: "Package not found." };
  }

  // No items yet at creation → subtotal 0; total reflects discount/tax only.
  const totals = computeTotals({ items: [], discount: data.discount, tax: data.tax });
  const reference = await nextReference(db, tenantId);

  const booking = await db.booking.create({
    data: {
      tenantId,
      reference,
      customerId: parsed.data.customerId,
      ...data,
      subtotal: totals.subtotal,
      total: totals.total,
    },
    select: { id: true },
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId: booking.id,
      userId: session.user.id,
      type: "CREATED",
      title: `Booking ${reference} created`,
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "booking",
    entityId: booking.id,
    metadata: { reference },
  });
  logger.info("booking created", { tenantId, bookingId: booking.id, reference });
  return { ok: true, data: { bookingId: booking.id } };
}

export async function updateBookingAction(
  tenantId: string,
  bookingId: string,
  input: BookingFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = bookingFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.booking.findFirst({
    where: { id: bookingId, tenantId, deletedAt: null },
    select: { id: true, customerId: true },
  });
  if (!existing) return { ok: false, error: "Booking not found." };

  const data = headerData(parsed.data);
  if (data.packageId) {
    const pkg = await db.package.findFirst({
      where: { id: data.packageId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!pkg) return { ok: false, error: "Package not found." };
  }

  // The customer can be reassigned; validate the new one belongs to the tenant.
  if (parsed.data.customerId !== existing.customerId) {
    const customer = await db.customer.findFirst({
      where: { id: parsed.data.customerId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) return { ok: false, error: "Customer not found." };
  }

  await db.booking.update({
    where: { id: bookingId, tenantId },
    data: { customerId: parsed.data.customerId, ...data },
  });
  // Discount/tax may have changed → totals must be re-derived from items.
  await recomputeBookingTotals(db, tenantId, bookingId);

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "UPDATED",
      title: "Booking details updated",
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "booking",
    entityId: bookingId,
  });
  return { ok: true };
}

export async function updateBookingStatusAction(
  tenantId: string,
  bookingId: string,
  input: UpdateBookingStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = updateBookingStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId, deletedAt: null },
    select: { status: true },
  });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status === parsed.data.status) return { ok: true };

  if (!canTransition(booking.status, parsed.data.status)) {
    return {
      ok: false,
      error: `Cannot move a ${BOOKING_STATUS_LABELS[booking.status].toLowerCase()} booking to ${BOOKING_STATUS_LABELS[parsed.data.status].toLowerCase()}.`,
    };
  }

  await db.booking.update({
    where: { id: bookingId, tenantId },
    data: {
      status: parsed.data.status,
      confirmedAt:
        parsed.data.status === "CONFIRMED" ? new Date() : undefined,
    },
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "STATUS_CHANGED",
      title: `Status: ${BOOKING_STATUS_LABELS[booking.status]} → ${BOOKING_STATUS_LABELS[parsed.data.status]}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "status",
    entity: "booking",
    entityId: bookingId,
    metadata: { from: booking.status, to: parsed.data.status },
  });
  return { ok: true };
}

export async function cancelBookingAction(
  tenantId: string,
  bookingId: string,
  input: CancelBookingInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = cancelBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId, deletedAt: null },
    select: { status: true },
  });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status === "CANCELLED") return { ok: true };
  if (!canTransition(booking.status, "CANCELLED")) {
    return { ok: false, error: "This booking can no longer be cancelled." };
  }

  const reason = emptyToNull(parsed.data.reason);
  await db.booking.update({
    where: { id: bookingId, tenantId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "CANCELLED",
      title: "Booking cancelled",
      description: reason,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "cancel",
    entity: "booking",
    entityId: bookingId,
  });
  logger.info("booking cancelled", { tenantId, bookingId });
  return { ok: true };
}

export async function assignBookingAction(
  tenantId: string,
  bookingId: string,
  input: AssignBookingInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = assignBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const ownerId = emptyToNull(parsed.data.ownerId);
  if (ownerId) {
    const membership = await db.membership.findFirst({
      where: { userId: ownerId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!membership) return { ok: false, error: "Owner is not a member of this workspace." };
  }

  const existing = await db.booking.findFirst({
    where: { id: bookingId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Booking not found." };

  await db.booking.update({ where: { id: bookingId, tenantId }, data: { ownerId } });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "ASSIGNED",
      title: ownerId ? "Booking assigned" : "Booking unassigned",
      metadata: { ownerId },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "assign",
    entity: "booking",
    entityId: bookingId,
    metadata: { ownerId },
  });
  return { ok: true };
}

export async function deleteBookingAction(
  tenantId: string,
  bookingId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "delete");

  const existing = await db.booking.findFirst({
    where: { id: bookingId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Booking not found." };

  await db.booking.update({
    where: { id: bookingId, tenantId },
    data: { deletedAt: new Date() },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "booking",
    entityId: bookingId,
  });
  logger.info("booking deleted", { tenantId, bookingId });
  return { ok: true };
}
