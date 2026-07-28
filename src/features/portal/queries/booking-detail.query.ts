import "server-only";

import type { BookingItemType, BookingStatus, ConfirmationStatus, TravellerType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type PortalBookingItemView = {
  id: string;
  type: BookingItemType;
  description: string;
  quantity: number;
  amount: number;
  currency: string;
  confirmationStatus: ConfirmationStatus | null;
  confirmationNumber: string | null;
};

export type PortalTravellerView = {
  id: string;
  firstName: string;
  lastName: string;
  type: TravellerType;
  isPrimary: boolean;
};

export type PortalTimelineEntryType =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "SUPPLIER_CONFIRMED"
  | "VOUCHER_ISSUED";

export type PortalTimelineEntry = {
  type: PortalTimelineEntryType;
  title: string;
  occurredAt: Date;
};

export type PortalBookingDetail = {
  id: string;
  reference: string;
  status: BookingStatus;
  travelStartDate: Date | null;
  travelEndDate: Date | null;
  adults: number;
  children: number;
  currency: string;
  total: number;
  /** Customer-facing notes only — `Booking.internalNotes` is never selected
   * by this query, let alone returned. */
  notes: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  items: PortalBookingItemView[];
  travellers: PortalTravellerView[];
  timeline: PortalTimelineEntry[];
};

/**
 * The portal's booking detail read model. Deliberately NOT a reuse of
 * `features/bookings/queries/get-booking.query.ts` — that query returns
 * `internalNotes` and raw `BookingActivity` rows, both of which can (and
 * routinely do, elsewhere in this codebase) carry internal operational
 * language never meant for a traveler ("Executed against an unpaid booking
 * (manager override)", "Supplier execution needs manual reconciliation").
 * Filtering that after the fact is one missed field away from a leak; this
 * query instead selects only fields that are safe by construction and
 * synthesizes the "timeline of updates" from already-structured, known-safe
 * timestamps (booking/supplier/voucher milestones) rather
 * than surfacing free-text activity notes at all. See PROJECT.md, "Customer
 * Portal Capability".
 */
export async function getPortalBookingDetail(
  db: TenantDb,
  tenantId: string,
  customerId: string,
  bookingId: string,
): Promise<PortalBookingDetail | null> {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId, customerId, deletedAt: null },
    select: {
      id: true,
      reference: true,
      status: true,
      travelStartDate: true,
      travelEndDate: true,
      adults: true,
      children: true,
      currency: true,
      total: true,
      notes: true,
      confirmedAt: true,
      cancelledAt: true,
      cancelReason: true,
      createdAt: true,
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          type: true,
          description: true,
          quantity: true,
          amount: true,
          confirmation: { select: { status: true, confirmationNumber: true, respondedAt: true } },
        },
      },
      travellers: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: { id: true, firstName: true, lastName: true, type: true, isPrimary: true },
      },
      confirmations: {
        where: { status: "CONFIRMED" },
        select: { supplierName: true, confirmationNumber: true, respondedAt: true, item: { select: { description: true } } },
      },
      vouchers: {
        where: { status: "ISSUED" },
        select: { serviceDescription: true, issuedAt: true },
      },
    },
  });
  if (!booking) return null;

  const timeline: PortalTimelineEntry[] = [
    { type: "BOOKING_CREATED", title: "Booking created", occurredAt: booking.createdAt },
  ];
  if (booking.confirmedAt) {
    timeline.push({ type: "BOOKING_CONFIRMED", title: "Booking confirmed", occurredAt: booking.confirmedAt });
  }
  for (const c of booking.confirmations) {
    if (!c.respondedAt) continue;
    timeline.push({
      type: "SUPPLIER_CONFIRMED",
      title: `${c.item.description} confirmed${c.supplierName ? ` by ${c.supplierName}` : ""}${c.confirmationNumber ? ` — #${c.confirmationNumber}` : ""}`,
      occurredAt: c.respondedAt,
    });
  }
  for (const v of booking.vouchers) {
    if (!v.issuedAt) continue;
    timeline.push({ type: "VOUCHER_ISSUED", title: `Voucher issued: ${v.serviceDescription}`, occurredAt: v.issuedAt });
  }
  if (booking.cancelledAt) {
    timeline.push({ type: "BOOKING_CANCELLED", title: "Booking cancelled", occurredAt: booking.cancelledAt });
  }
  timeline.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    travelStartDate: booking.travelStartDate,
    travelEndDate: booking.travelEndDate,
    adults: booking.adults,
    children: booking.children,
    currency: booking.currency,
    total: toNumber(booking.total) ?? 0,
    notes: booking.notes,
    cancelledAt: booking.cancelledAt,
    cancelReason: booking.cancelReason,
    createdAt: booking.createdAt,
    items: booking.items.map((i) => ({
      id: i.id,
      type: i.type,
      description: i.description,
      quantity: i.quantity,
      amount: toNumber(i.amount) ?? 0,
      currency: booking.currency,
      confirmationStatus: i.confirmation?.status ?? null,
      confirmationNumber: i.confirmation?.confirmationNumber ?? null,
    })),
    travellers: booking.travellers,
    timeline,
  };
}
