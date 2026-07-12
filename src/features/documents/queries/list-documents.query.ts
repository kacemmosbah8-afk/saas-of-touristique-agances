import type { DocumentCategory, Prisma } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { buildNameSort, paginate, pageMeta } from "@/shared/lib/list-query";
import type { ListDocumentsFilters } from "@/features/documents/schemas/document.schema";

export type DocumentSummary = {
  id: string;
  name: string;
  category: DocumentCategory;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  ownerType: string | null;
  ownerId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentListResult = {
  documents: DocumentSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listDocuments(
  db: TenantDb,
  filters: ListDocumentsFilters = {},
): Promise<DocumentListResult> {
  const { search, category, sort } = filters;
  const { page, skip, take } = paginate(filters.page);

  const where: Prisma.DocumentWhereInput = {
    deletedAt: null,
    ...(category && category !== "all" ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { notes: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [documents, total] = await Promise.all([
    db.document.findMany({
      where,
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
      orderBy: buildNameSort(sort),
      skip,
      take,
    }),
    db.document.count({ where }),
  ]);

  return { documents, ...pageMeta(total, page) };
}
