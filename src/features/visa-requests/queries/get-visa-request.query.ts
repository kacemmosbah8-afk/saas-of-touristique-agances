import "server-only";

import type { VisaRequestStatus, VisaRequestActivityType, DocumentCategory } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type VisaRequestActivityView = {
  id: string;
  type: VisaRequestActivityType;
  title: string;
  description: string | null;
  userId: string | null;
  createdAt: Date;
};

export type VisaRequestTravellerView = {
  id: string;
  order: number;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  nationality: string;
  passportNumber: string;
  passportIssuingCountry: string;
  passportIssueDate: Date | null;
  passportExpiry: Date;
};

export type VisaRequestDocumentView = {
  id: string;
  category: DocumentCategory;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  qualityNotes: string | null;
  createdAt: Date;
};

export type VisaRequestDetail = {
  id: string;
  reference: string;
  destinationCountry: string;
  nationality: string;
  visaType: string;
  travelStartDate: Date | null;
  travelEndDate: Date | null;
  travelerCount: number;
  fullName: string;
  email: string | null;
  phone: string;
  phoneVerifiedAt: Date | null;
  whatsapp: string | null;
  notes: string | null;
  internalNotes: string | null;
  status: VisaRequestStatus;
  contactedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectReason: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  customerId: string | null;
  customerName: string | null;
  bookingId: string | null;
  bookingReference: string | null;
  createdAt: Date;
  updatedAt: Date;
  travellers: VisaRequestTravellerView[];
  documents: VisaRequestDocumentView[];
  activities: VisaRequestActivityView[];
};

export async function getVisaRequest(
  db: TenantDb,
  tenantId: string,
  visaRequestId: string,
): Promise<VisaRequestDetail | null> {
  const request = await db.visaRequest.findFirst({
    // Explicit tenantId: single-record lookups are not auto-scoped (see db.ts).
    where: { id: visaRequestId, tenantId },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      booking: { select: { reference: true } },
      travellers: { orderBy: { order: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!request) return null;

  return {
    id: request.id,
    reference: request.reference,
    destinationCountry: request.destinationCountry,
    nationality: request.nationality,
    visaType: request.visaType,
    travelStartDate: request.travelStartDate,
    travelEndDate: request.travelEndDate,
    travelerCount: request.travelerCount,
    fullName: request.fullName,
    email: request.email,
    phone: request.phone,
    phoneVerifiedAt: request.phoneVerifiedAt,
    whatsapp: request.whatsapp,
    notes: request.notes,
    internalNotes: request.internalNotes,
    status: request.status,
    contactedAt: request.contactedAt,
    approvedAt: request.approvedAt,
    rejectedAt: request.rejectedAt,
    rejectReason: request.rejectReason,
    cancelledAt: request.cancelledAt,
    cancelReason: request.cancelReason,
    customerId: request.customerId,
    customerName: request.customer
      ? `${request.customer.firstName} ${request.customer.lastName}`.trim()
      : null,
    bookingId: request.bookingId,
    bookingReference: request.booking?.reference ?? null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    travellers: request.travellers,
    documents: request.documents,
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
