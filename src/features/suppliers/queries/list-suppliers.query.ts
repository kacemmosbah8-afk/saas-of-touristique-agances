import type { Prisma, ResourceStatus, SupplierType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { buildNameSort, paginate, pageMeta } from "@/shared/lib/list-query";
import { statusWhere } from "@/shared/schemas/list.schema";
import type { ListSuppliersFilters } from "@/features/suppliers/schemas/supplier.schema";

export type SupplierSummary = {
  id: string;
  name: string;
  type: SupplierType;
  city: string | null;
  country: string | null;
  internalRating: number | null;
  status: ResourceStatus;
  updatedAt: Date;
};

export type SupplierListResult = {
  suppliers: SupplierSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listSuppliers(
  db: TenantDb,
  filters: ListSuppliersFilters = {},
): Promise<SupplierListResult> {
  const { search, status, sort, type } = filters;
  const { page, skip, take } = paginate(filters.page);

  const where: Prisma.SupplierWhereInput = {
    ...statusWhere(status),
    ...(type && type !== "all" ? { type } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { contactName: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { country: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [suppliers, total] = await Promise.all([
    db.supplier.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
        country: true,
        internalRating: true,
        status: true,
        updatedAt: true,
      },
      orderBy: buildNameSort(sort),
      skip,
      take,
    }),
    db.supplier.count({ where }),
  ]);

  return { suppliers, ...pageMeta(total, page) };
}
