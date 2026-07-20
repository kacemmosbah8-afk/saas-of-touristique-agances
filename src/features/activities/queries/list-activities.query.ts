import type { Prisma, ResourceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { buildNameSort, paginate, pageMeta, toNumber } from "@/shared/lib/list-query";
import { statusWhere } from "@/shared/schemas/list.schema";
import type { ListActivitiesFilters } from "@/features/activities/schemas/activity.schema";

export type ActivitySummary = {
  id: string;
  name: string;
  slug: string;
  featured: boolean;
  category: string | null;
  durationMinutes: number | null;
  city: string | null;
  country: string | null;
  sellingPrice: number | null;
  currency: string;
  coverImageUrl: string | null;
  status: ResourceStatus;
  updatedAt: Date;
};

export type ActivityListResult = {
  activities: ActivitySummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listActivities(
  db: TenantDb,
  filters: ListActivitiesFilters = {},
): Promise<ActivityListResult> {
  const { search, status, sort } = filters;
  const { page, skip, take } = paginate(filters.page);

  const where: Prisma.ActivityWhereInput = {
    ...statusWhere(status),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { country: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [activities, total] = await Promise.all([
    db.activity.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        featured: true,
        category: true,
        durationMinutes: true,
        city: true,
        country: true,
        sellingPrice: true,
        currency: true,
        coverImageUrl: true,
        status: true,
        updatedAt: true,
      },
      orderBy: buildNameSort(sort),
      skip,
      take,
    }),
    db.activity.count({ where }),
  ]);

  return {
    activities: activities.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      featured: a.featured,
      category: a.category,
      durationMinutes: a.durationMinutes,
      city: a.city,
      country: a.country,
      sellingPrice: toNumber(a.sellingPrice),
      currency: a.currency,
      coverImageUrl: a.coverImageUrl,
      status: a.status,
      updatedAt: a.updatedAt,
    })),
    ...pageMeta(total, page),
  };
}
