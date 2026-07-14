"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import type { ActionResult } from "@/shared/types/action-result";
import {
  generateVoucherSchema,
  type GenerateVoucherInput,
} from "@/features/vouchers/schemas/voucher.schema";
import {
  formatVoucherReference,
  buildVoucherQrData,
} from "@/features/vouchers/lib/voucher-reference";

type TenantDbFrom = Awaited<ReturnType<typeof requirePermission>>["db"];

async function nextVoucherReference(db: TenantDbFrom, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await db.voucher.count({
    where: { tenantId, createdAt: { gte: start, lt: end } },
  });
  return formatVoucherReference(year, count + 1);
}

/**
 * Issue an operational voucher for one service line. Everything printed is
 * snapshotted here — traveller names, supplier (from the line's confirmation
 * when present), travel dates, service text — so later booking edits never
 * rewrite a voucher already handed to a customer; reissue instead. Only
 * confirmed/running/completed bookings can issue vouchers (a draft has
 * nothing operational to hand over; a cancelled booking must not).
 */
export async function generateVoucherAction(
  tenantId: string,
  bookingId: string,
  input: GenerateVoucherInput,
): Promise<ActionResult<{ voucherId: string }>> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = generateVoucherSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId, deletedAt: null },
    select: {
      status: true,
      reference: true,
      travelStartDate: true,
      travelEndDate: true,
      travellers: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: { firstName: true, lastName: true },
      },
    },
  });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status === "DRAFT") {
    return { ok: false, error: "Confirm the booking before issuing vouchers." };
  }
  if (booking.status === "CANCELLED") {
    return { ok: false, error: "A cancelled booking can't issue vouchers." };
  }
  if (booking.travellers.length === 0) {
    return { ok: false, error: "Add at least one traveller before issuing a voucher." };
  }

  const item = await db.bookingItem.findFirst({
    where: { id: parsed.data.bookingItemId, bookingId, tenantId },
    select: {
      id: true,
      type: true,
      description: true,
      supplierRateComments: true,
      confirmation: {
        select: { status: true, supplierName: true, confirmationNumber: true },
      },
    },
  });
  if (!item) return { ok: false, error: "Booking line not found." };

  const confirmationNumber =
    item.confirmation?.status === "CONFIRMED" ? item.confirmation.confirmationNumber : null;
  const reference = await nextVoucherReference(db, tenantId);

  const voucher = await db.voucher.create({
    data: {
      tenantId,
      reference,
      bookingId,
      bookingItemId: item.id,
      type: item.type,
      supplierName: item.confirmation?.supplierName ?? null,
      serviceDescription: item.description,
      serviceStartDate: booking.travelStartDate,
      serviceEndDate: booking.travelEndDate,
      travellerNames: booking.travellers.map((t) => `${t.firstName} ${t.lastName}`.trim()),
      confirmationNumber,
      qrData: buildVoucherQrData({
        voucherReference: reference,
        bookingReference: booking.reference,
        confirmationNumber,
      }),
      // Agent-typed notes win when present; otherwise default to the
      // supplier's own rate conditions captured at booking-prep time (see
      // BookingItem.supplierRateComments) so cancellation/rate notices
      // reach the printed customer document, not just the booking screen.
      notes: emptyToNull(parsed.data.notes) ?? item.supplierRateComments,
      issuedBy: session.user.id,
    },
    select: { id: true },
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "UPDATED",
      title: `Voucher ${reference} issued — ${item.description}`,
      metadata: { voucherId: voucher.id },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "voucher_generate",
    entity: "booking",
    entityId: bookingId,
    metadata: { voucherId: voucher.id, reference },
  });
  logger.info("voucher issued", { tenantId, bookingId, voucherId: voucher.id, reference });
  return { ok: true, data: { voucherId: voucher.id } };
}

/** Cancel an issued voucher (kept on record, marked cancelled). */
export async function cancelVoucherAction(
  tenantId: string,
  voucherId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const voucher = await db.voucher.findFirst({
    where: { id: voucherId, tenantId },
    select: { status: true, bookingId: true, reference: true },
  });
  if (!voucher) return { ok: false, error: "Voucher not found." };
  if (voucher.status === "CANCELLED") return { ok: true };

  await db.voucher.update({
    where: { id: voucherId, tenantId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId: voucher.bookingId,
      userId: session.user.id,
      type: "UPDATED",
      title: `Voucher ${voucher.reference} cancelled`,
      metadata: { voucherId },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "voucher_cancel",
    entity: "booking",
    entityId: voucher.bookingId,
    metadata: { voucherId },
  });
  logger.info("voucher cancelled", { tenantId, voucherId });
  return { ok: true };
}
