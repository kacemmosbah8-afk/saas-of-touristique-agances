import "server-only";

import type { VisaRequestStatus, DocumentCategory } from "@prisma/client";

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
  travellers: { firstName: string; lastName: string }[];
  documents: { category: DocumentCategory }[];
};

/** Everything `buildVisaRequestsCsv` needs, and nothing more — document
 * rows are narrowed to `category` only (no `url`/`fileKey`), so a file
 * response built from this query can never leak document file access. */
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
      travellers: { select: { firstName: true, lastName: true }, orderBy: { order: "asc" } },
      documents: { select: { category: true } },
    },
  });
}
