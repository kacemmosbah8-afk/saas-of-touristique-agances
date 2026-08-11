import "server-only";

import type {
  VisaRequestStatus,
  VisaRequestActivityType,
  DocumentCategory,
  VisaTravelPurpose,
  VisaEmploymentStatus,
  VisaAccommodationType,
  VisaPayerType,
} from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import {
  resolveDocumentRequirements,
  computeCompleteness,
  type DocumentRequirementKey,
  type CompletenessResult,
} from "@/features/visa-requests/lib/document-requirements";

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
  requirementKey: string | null;
  requirementLabel: string | null;
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
  // --- Visa case questionnaire — all nullable: added after this feature
  // went live, so rows submitted before it shipped have no values (see
  // `document-requirements.ts`'s comment on why nullable is permanent
  // here, not a migration stepping stone).
  countryOfResidence: string | null;
  purposeOfTravel: VisaTravelPurpose | null;
  employmentStatus: VisaEmploymentStatus | null;
  accommodationType: VisaAccommodationType | null;
  payerType: VisaPayerType | null;
  payerName: string | null;
  payerRelationship: string | null;
  hostName: string | null;
  hostRelationship: string | null;
  hasPreviousTravel: boolean;
  previousTravelNotes: string | null;
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

/** Sentinel returned when a request predates the case questionnaire (any of
 * the 4 fields the checklist engine needs is null) — there is nothing
 * legitimate to compute a checklist against, so the admin UI must render an
 * explicit "not collected" state rather than a misleading zero/zero. */
export const LEGACY_NO_QUESTIONNAIRE = "LEGACY_NO_QUESTIONNAIRE" as const;

/**
 * Re-resolves the same checklist the visitor saw at submission time and
 * scores it against the documents actually on file. Never returns a
 * "complete" verdict — see `computeCompleteness`'s own comment; the admin
 * UI must always pair this with "final document review required" copy.
 */
export function computeVisaRequestCompleteness(
  detail: VisaRequestDetail,
): CompletenessResult | typeof LEGACY_NO_QUESTIONNAIRE {
  if (
    !detail.countryOfResidence ||
    !detail.purposeOfTravel ||
    !detail.employmentStatus ||
    !detail.accommodationType ||
    !detail.payerType
  ) {
    return LEGACY_NO_QUESTIONNAIRE;
  }
  const checklist = resolveDocumentRequirements({
    destinationCountry: detail.destinationCountry,
    countryOfResidence: detail.countryOfResidence,
    purposeOfTravel: detail.purposeOfTravel,
    employmentStatus: detail.employmentStatus,
    accommodationType: detail.accommodationType,
    payerType: detail.payerType,
    hasPreviousTravel: detail.hasPreviousTravel,
  });
  return computeCompleteness(
    checklist,
    detail.documents.map((d) => ({ requirementKey: d.requirementKey as DocumentRequirementKey | null })),
  );
}

/** Same re-resolution as `computeVisaRequestCompleteness`, exposed
 * separately for `VisaRequestDetail`'s document list (which needs the
 * full per-requirement checklist, not just the satisfied/missing counts). */
export function resolveVisaRequestChecklist(detail: VisaRequestDetail) {
  if (
    !detail.countryOfResidence ||
    !detail.purposeOfTravel ||
    !detail.employmentStatus ||
    !detail.accommodationType ||
    !detail.payerType
  ) {
    return null;
  }
  return resolveDocumentRequirements({
    destinationCountry: detail.destinationCountry,
    countryOfResidence: detail.countryOfResidence,
    purposeOfTravel: detail.purposeOfTravel,
    employmentStatus: detail.employmentStatus,
    accommodationType: detail.accommodationType,
    payerType: detail.payerType,
    hasPreviousTravel: detail.hasPreviousTravel,
  });
}

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
    countryOfResidence: request.countryOfResidence,
    purposeOfTravel: request.purposeOfTravel,
    employmentStatus: request.employmentStatus,
    accommodationType: request.accommodationType,
    payerType: request.payerType,
    payerName: request.payerName,
    payerRelationship: request.payerRelationship,
    hostName: request.hostName,
    hostRelationship: request.hostRelationship,
    hasPreviousTravel: request.hasPreviousTravel,
    previousTravelNotes: request.previousTravelNotes,
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
