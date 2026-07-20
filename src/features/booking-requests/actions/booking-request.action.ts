"use server";

import type { BookingItemType } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { computeTotals } from "@/features/bookings/lib/totals";
import { formatBookingReference } from "@/features/bookings/lib/reference";
import type { ActionResult } from "@/shared/types/action-result";
import {
  updateBookingRequestStatusSchema,
  addBookingRequestNoteSchema,
  convertBookingRequestSchema,
  type UpdateBookingRequestStatusInput,
  type AddBookingRequestNoteInput,
  type ConvertBookingRequestInput,
} from "@/features/booking-requests/schemas/booking-request.schema";
import {
  canTransition,
  canConvert,
  BOOKING_REQUEST_STATUS_LABELS,
} from "@/features/booking-requests/lib/status";

const PRODUCT_TYPE_TO_BOOKING_ITEM_TYPE: Record<string, BookingItemType> = {
  PACKAGE: "PACKAGE",
  HOTEL: "HOTEL",
  ACTIVITY: "ACTIVITY",
  FLIGHT: "FLIGHT",
  DESTINATION: "OTHER",
};

/**
 * Change a booking request's status by hand (Pending/Contacted/Rejected/
 * Cancelled — CONFIRMED is a system state, only set by
 * `convertBookingRequestAction`). Mirrors
 * `bookings/actions/booking.action.ts`'s `updateBookingStatusAction`.
 */
export async function updateBookingRequestStatusAction(
  tenantId: string,
  bookingRequestId: string,
  input: UpdateBookingRequestStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "bookingRequest", "update");

  const parsed = updateBookingRequestStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const request = await db.bookingRequest.findFirst({
    where: { id: bookingRequestId, tenantId },
    select: { status: true },
  });
  if (!request) return { ok: false, error: "Booking request not found." };
  if (request.status === parsed.data.status) return { ok: true };

  if (!canTransition(request.status, parsed.data.status)) {
    return {
      ok: false,
      error: `Cannot move a ${BOOKING_REQUEST_STATUS_LABELS[request.status].toLowerCase()} request to ${BOOKING_REQUEST_STATUS_LABELS[parsed.data.status].toLowerCase()}.`,
    };
  }

  await db.bookingRequest.update({
    where: { id: bookingRequestId, tenantId },
    data: {
      status: parsed.data.status,
      contactedAt: parsed.data.status === "CONTACTED" ? new Date() : undefined,
      rejectedAt: parsed.data.status === "REJECTED" ? new Date() : undefined,
      rejectReason: parsed.data.status === "REJECTED" ? parsed.data.reason || null : undefined,
      cancelledAt: parsed.data.status === "CANCELLED" ? new Date() : undefined,
      cancelReason: parsed.data.status === "CANCELLED" ? parsed.data.reason || null : undefined,
    },
  });

  await db.bookingRequestActivity.create({
    data: {
      tenantId,
      bookingRequestId,
      userId: session.user.id,
      type: parsed.data.status === "CONTACTED" ? "CONTACTED" : "STATUS_CHANGED",
      title: `Status changed to ${BOOKING_REQUEST_STATUS_LABELS[parsed.data.status]}`,
      description: parsed.data.reason || null,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "status_change",
    entity: "booking_request",
    entityId: bookingRequestId,
    metadata: { status: parsed.data.status },
  });
  logger.info("booking request status changed", {
    tenantId,
    bookingRequestId,
    status: parsed.data.status,
  });
  return { ok: true };
}

/** Log a "contacted the customer" note — the audit trail for the "Contact" workflow step. */
export async function addBookingRequestNoteAction(
  tenantId: string,
  bookingRequestId: string,
  input: AddBookingRequestNoteInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "bookingRequest", "update");

  const parsed = addBookingRequestNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }

  const request = await db.bookingRequest.findFirst({
    where: { id: bookingRequestId, tenantId },
    select: { id: true },
  });
  if (!request) return { ok: false, error: "Booking request not found." };

  await db.bookingRequestActivity.create({
    data: {
      tenantId,
      bookingRequestId,
      userId: session.user.id,
      type: "NOTE_ADDED",
      title: "Note added",
      description: parsed.data.note,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "note",
    entity: "booking_request",
    entityId: bookingRequestId,
  });
  return { ok: true };
}

/**
 * Convert a booking request into a confirmed Booking. Creates a customer
 * from the request's contact info (or links an existing one, the same
 * choice `convertLeadAction` offers), then a CONFIRMED booking with one
 * line item captured from the requested product — an agent fills in the
 * real price afterward from the booking's own line-item editor, the same
 * "seed everything but the price" pattern the quote pricing catalog uses
 * for rate-less inventory. Idempotent: an already-converted request
 * returns its existing booking.
 */
export async function convertBookingRequestAction(
  tenantId: string,
  bookingRequestId: string,
  input: ConvertBookingRequestInput,
): Promise<ActionResult<{ bookingId: string }>> {
  const { session, db } = await requirePermission(tenantId, "bookingRequest", "update");

  const parsed = convertBookingRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const request = await db.bookingRequest.findFirst({
    where: { id: bookingRequestId, tenantId },
    select: {
      id: true,
      status: true,
      fullName: true,
      email: true,
      phone: true,
      adults: true,
      children: true,
      preferredDate: true,
      returnDate: true,
      notes: true,
      productType: true,
      productId: true,
      productName: true,
      convertedBookingId: true,
    },
  });
  if (!request) return { ok: false, error: "Booking request not found." };

  if (request.convertedBookingId) {
    return { ok: true, data: { bookingId: request.convertedBookingId } };
  }
  if (!canConvert(request.status)) {
    return {
      ok: false,
      error: `A ${BOOKING_REQUEST_STATUS_LABELS[request.status].toLowerCase()} request cannot be converted.`,
    };
  }

  let customerId: string;
  if (parsed.data.existingCustomerId) {
    const existing = await db.customer.findFirst({
      where: { id: parsed.data.existingCustomerId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Customer not found." };
    customerId = existing.id;
  } else {
    const nameParts = request.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? request.fullName;
    const lastName = nameParts.slice(1).join(" ") || "—";

    const customer = await db.customer.create({
      data: {
        tenantId,
        firstName,
        lastName,
        email: request.email,
        phone: request.phone,
        leadSource: "WEBSITE",
      },
      select: { id: true },
    });
    customerId = customer.id;

    await db.customerActivity.create({
      data: {
        tenantId,
        customerId,
        userId: session.user.id,
        type: "CREATED",
        title: "Customer created from booking request",
        description: request.productName,
      },
    });
  }

  const itemType = PRODUCT_TYPE_TO_BOOKING_ITEM_TYPE[request.productType] ?? "OTHER";
  const totals = computeTotals({
    items: [{ quantity: 1, unitPrice: 0 }],
    discount: 0,
    tax: 0,
  });

  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await db.booking.count({ where: { tenantId, createdAt: { gte: start, lt: end } } });
  const reference = formatBookingReference(year, count + 1);

  const booking = await db.booking.create({
    data: {
      tenantId,
      reference,
      customerId,
      packageId: request.productType === "PACKAGE" ? request.productId : null,
      status: "CONFIRMED",
      confirmedAt: new Date(),
      travelStartDate: request.preferredDate,
      travelEndDate: request.returnDate,
      adults: request.adults,
      children: request.children,
      notes: request.notes,
      subtotal: totals.subtotal,
      total: totals.total,
    },
    select: { id: true },
  });

  await db.bookingItem.create({
    data: {
      tenantId,
      bookingId: booking.id,
      type: itemType,
      description: request.productName,
      referenceId: request.productId,
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    },
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId: booking.id,
      userId: session.user.id,
      type: "CREATED",
      title: `Booking ${reference} created from booking request`,
    },
  });

  await db.bookingRequest.update({
    where: { id: bookingRequestId, tenantId },
    data: { status: "CONFIRMED", customerId, convertedBookingId: booking.id },
  });

  await db.bookingRequestActivity.create({
    data: {
      tenantId,
      bookingRequestId,
      userId: session.user.id,
      type: "CONVERTED",
      title: `Converted to booking ${reference}`,
      metadata: { bookingId: booking.id },
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "convert",
    entity: "booking_request",
    entityId: bookingRequestId,
    metadata: { bookingId: booking.id },
  });
  logger.info("booking request converted", { tenantId, bookingRequestId, bookingId: booking.id });
  return { ok: true, data: { bookingId: booking.id } };
}
