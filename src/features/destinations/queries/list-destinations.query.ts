import type { Prisma, ResourceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { buildNameSort, paginate, pageMeta } from "@/shared/lib/list-query";
import { statusWhere } from "@/shared/schemas/list.schema";
import type { ListDestinationsFilters } from "@/features/destinations/schemas/destination.schema";

export type DestinationSummary = {
  id: string;
  name: string;
  country: string;
  region: string | null;
  city: string | null;
  heroImageUrl: string | null;
  status: ResourceStatus;
  updatedAt: Date;
};

export type DestinationListResult = {
  destinations: DestinationSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listDestinations(
  db: TenantDb,
  filters: ListDestinationsFilters = {},
): Promise<DestinationListResult> {
  const { search, status, sort } = filters;
  const { page, skip, take } = paginate(filters.page);

  const where: Prisma.DestinationWhereInput = {
    ...statusWhere(status),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { country: { contains: search, mode: "insensitive" } },
            { region: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [destinations, total] = await Promise.all([
    db.destination.findMany({
      where,
      select: {
        id: true,
        name: true,
        country: true,
        region: true,
        city: true,
        heroImageUrl: true,
        status: true,
        updatedAt: true,
      },
      orderBy: buildNameSort(sort),
      skip,
      take,
    }),
    db.destination.count({ where }),
  ]);

  return { destinations, ...pageMeta(total, page) };
}
