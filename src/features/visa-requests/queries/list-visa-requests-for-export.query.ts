import "server-only";

import type {
  VisaRequestStatus,
  DocumentCategory,
  VisaTravelPurpose,
  VisaEmploymentStatus,
  VisaAccommodationType,
  VisaPayerType,
} from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type VisaRequestExportRow = {
  reference: string;
  status: VisaRequestStatus;
  createdAt: Date;
  fullName: string;
  email: string | null;
  phone: string;
  phoneVerifiedAt: Date | null;
  destinationCountry: string;
  nationality: string;
  visaType: string;
  travelStartDate: Date | null;
  travelEndDate: Date | null;
  travelerCount: number;
  countryOfResidence: string | null;
  purposeOfTravel: VisaTravelPurpose | null;
  employmentStatus: VisaEmploymentStatus | null;
  accommodationType: VisaAccommodationType | null;
  payerType: VisaPayerType | null;
  hasPreviousTravel: boolean;
  travellers: { firstName: string; lastName: string }[];
  documents: { category: DocumentCategory; requirementKey: string | null }[];
};

/** Everything `buildVisaRequestsCsv` needs, and nothing more — document
 * rows are narrowed to `category`/`requirementKey` only (no `url`/`fileKey`),
 * so a file response built from this query can never leak document file
 * access. */
export async function listVisaRequestsForExport(db: TenantDb, tenantId: string): Promise<VisaRequestExportRow[]> {
  return db.visaRequest.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      reference: true,
      status: true,
      createdAt: true,
      fullName: true,
      email: true,
      phone: true,
      phoneVerifiedAt: true,
      destinationCountry: true,
      nationality: true,
      visaType: true,
      travelStartDate: true,
      travelEndDate: true,
      travelerCount: true,
      countryOfResidence: true,
      purposeOfTravel: true,
      employmentStatus: true,
      accommodationType: true,
      payerType: true,
      hasPreviousTravel: true,
      travellers: { select: { firstName: true, lastName: true }, orderBy: { order: "asc" } },
      documents: { select: { category: true, requirementKey: true } },
    },
  });
}
