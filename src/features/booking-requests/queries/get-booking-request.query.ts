import "server-only";

import type {
  BookingRequestStatus,
  BookingRequestProductType,
  BookingRequestActivityType,
} from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type BookingRequestActivityView = {
  id: string;
  type: BookingRequestActivityType;
  title: string;
  description: string | null;
  userId: string | null;
  createdAt: Date;
};

export type BookingRequestDetail = {
  id: string;
  reference: string;
  fullName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  adults: number;
  children: number;
  preferredDate: Date | null;
  returnDate: Date | null;
  productType: BookingRequestProductType;
  productId: string;
  productName: string;
  productSlug: string;
  notes: string | null;
  internalNotes: string | null;
  status: BookingRequestStatus;
  contactedAt: Date | null;
  rejectedAt: Date | null;
  rejectReason: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  customerId: string | null;
  customerName: string | null;
  convertedBookingId: string | null;
  convertedBookingReference: string | null;
  createdAt: Date;
  updatedAt: Date;
  activities: BookingRequestActivityView[];
};

export async function getBookingRequest(
  db: TenantDb,
  tenantId: string,
  bookingRequestId: string,
): Promise<BookingRequestDetail | null> {
  const request = await db.bookingRequest.findFirst({
    // Explicit tenantId: single-record lookups are not auto-scoped (see db.ts).
    where: { id: bookingRequestId, tenantId },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      convertedBooking: { select: { reference: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!request) return null;

  return {
    id: request.id,
    reference: request.reference,
    fullName: request.fullName,
    email: request.email,
    phone: request.phone,
    whatsapp: request.whatsapp,
    adults: request.adults,
    children: request.children,
    preferredDate: request.preferredDate,
    returnDate: request.returnDate,
    productType: request.productType,
    productId: request.productId,
    productName: request.productName,
    productSlug: request.productSlug,
    notes: request.notes,
    internalNotes: request.internalNotes,
    status: request.status,
    contactedAt: request.contactedAt,
    rejectedAt: request.rejectedAt,
    rejectReason: request.rejectReason,
    cancelledAt: request.cancelledAt,
    cancelReason: request.cancelReason,
    customerId: request.customerId,
    customerName: request.customer
      ? `${request.customer.firstName} ${request.customer.lastName}`.trim()
      : null,
    convertedBookingId: request.convertedBookingId,
    convertedBookingReference: request.convertedBooking?.reference ?? null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    activities: request.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      userId: a.userId,
      createdAt: a.createdAt,
    })),
  };
}
