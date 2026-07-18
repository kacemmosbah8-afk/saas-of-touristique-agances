import "server-only";

import type { BookingStatus, BookingItemType, BookingActivityType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type BookingItemView = {
  id: string;
  type: BookingItemType;
  description: string;
  referenceId: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  notes: string | null;
  sortOrder: number;
};

export type BookingActivityView = {
  id: string;
  type: BookingActivityType;
  title: string;
  description: string | null;
  userId: string | null;
  createdAt: Date;
};

export type BookingDetail = {
  id: string;
  reference: string;
  status: BookingStatus;
  customerId: string;
  customerName: string;
  packageId: string | null;
  packageName: string | null;
  ownerId: string | null;
  travelStartDate: Date | null;
  travelEndDate: Date | null;
  adults: number;
  children: number;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  internalNotes: string | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: BookingItemView[];
  activities: BookingActivityView[];
};

export async function getBooking(
  db: TenantDb,
  tenantId: string,
  bookingId: string,
): Promise<BookingDetail | null> {
  const booking = await db.booking.findFirst({
    // Explicit tenantId: single-record lookups are not auto-scoped (see db.ts).
    where: { id: bookingId, tenantId, deletedAt: null },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      package: { select: { name: true } },
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!booking) return null;

  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    customerId: booking.customerId,
    customerName: `${booking.customer.firstName} ${booking.customer.lastName}`.trim(),
    packageId: booking.packageId,
    packageName: booking.package?.name ?? null,
    ownerId: booking.ownerId,
    travelStartDate: booking.travelStartDate,
    travelEndDate: booking.travelEndDate,
    adults: booking.adults,
    children: booking.children,
    currency: booking.currency,
    subtotal: toNumber(booking.subtotal) ?? 0,
    discount: toNumber(booking.discount) ?? 0,
    tax: toNumber(booking.tax) ?? 0,
    total: toNumber(booking.total) ?? 0,
    notes: booking.notes,
    internalNotes: booking.internalNotes,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    cancelReason: booking.cancelReason,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    items: booking.items.map((i) => ({
      id: i.id,
      type: i.type,
      description: i.description,
      referenceId: i.referenceId,
      quantity: i.quantity,
      unitPrice: toNumber(i.unitPrice) ?? 0,
      amount: toNumber(i.amount) ?? 0,
      notes: i.notes,
      sortOrder: i.sortOrder,
    })),
    activities: booking.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      userId: a.userId,
      createdAt: a.createdAt,
    })),
  };
}
