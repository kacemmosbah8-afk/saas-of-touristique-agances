import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import type { DocumentSummary } from "@/features/documents/queries/list-documents.query";

/**
 * Documents attached to one record through the polymorphic
 * `ownerType`/`ownerId` association (e.g. a traveller's passport scan:
 * ownerType "traveller"). Tenant isolation comes from the tenant-scoped
 * client's auto-injected `tenantId` on findMany.
 */
export async function listDocumentsForOwner(
  db: TenantDb,
  ownerType: string,
  ownerId: string,
): Promise<DocumentSummary[]> {
  return db.document.findMany({
    where: { deletedAt: null, ownerType, ownerId },
    select: {
      id: true,
      name: true,
      category: true,
      url: true,
      mimeType: true,
      sizeBytes: true,
      ownerType: true,
      ownerId: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
