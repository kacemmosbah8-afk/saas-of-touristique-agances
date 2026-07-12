import type { Prisma, ResourceStatus, TransportType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { buildNameSort, paginate, pageMeta } from "@/shared/lib/list-query";
import { statusWhere } from "@/shared/schemas/list.schema";
import type { ListTransportFilters } from "@/features/transport/schemas/transport.schema";

export type TransportSummary = {
  id: string;
  name: string;
  type: TransportType;
  country: string | null;
  city: string | null;
  contactPhone: string | null;
  status: ResourceStatus;
  updatedAt: Date;
};

export type TransportListResult = {
  providers: TransportSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listTransport(
  db: TenantDb,
  filters: ListTransportFilters = {},
): Promise<TransportListResult> {
  const { search, status, sort, type } = filters;
  const { page, skip, take } = paginate(filters.page);

  const where: Prisma.TransportProviderWhereInput = {
    ...statusWhere(status),
    ...(type && type !== "all" ? { type } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { country: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [providers, total] = await Promise.all([
    db.transportProvider.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        country: true,
        city: true,
        contactPhone: true,
        status: true,
        updatedAt: true,
      },
      orderBy: buildNameSort(sort),
      skip,
      take,
    }),
    db.transportProvider.count({ where }),
  ]);

  return { providers, ...pageMeta(total, page) };
}
