import type { Prisma, ResourceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { buildNameSort, paginate, pageMeta, toNumber } from "@/shared/lib/list-query";
import { statusWhere } from "@/shared/schemas/list.schema";
import type { ListGuidesFilters } from "@/features/guides/schemas/guide.schema";

export type GuideSummary = {
  id: string;
  name: string;
  languages: string[];
  experienceYears: number | null;
  dailyRate: number | null;
  currency: string;
  city: string | null;
  country: string | null;
  status: ResourceStatus;
  updatedAt: Date;
  attachedPackages: { id: string; slug: string; name: string }[];
};

export type GuideListResult = {
  guides: GuideSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listGuides(
  db: TenantDb,
  filters: ListGuidesFilters = {},
): Promise<GuideListResult> {
  const { search, status, sort } = filters;
  const { page, skip, take } = paginate(filters.page);

  const where: Prisma.GuideWhereInput = {
    ...statusWhere(status),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { country: { contains: search, mode: "insensitive" } },
            { languages: { has: search } },
          ],
        }
      : {}),
  };

  const [guides, total] = await Promise.all([
    db.guide.findMany({
      where,
      select: {
        id: true,
        name: true,
        languages: true,
        experienceYears: true,
        dailyRate: true,
        currency: true,
        city: true,
        country: true,
        status: true,
        updatedAt: true,
        packageGuides: {
          where: { package: { deletedAt: null } },
          select: { package: { select: { id: true, slug: true, name: true } } },
        },
      },
      orderBy: buildNameSort(sort),
      skip,
      take,
    }),
    db.guide.count({ where }),
  ]);

  return {
    guides: guides.map((g) => ({
      id: g.id,
      name: g.name,
      languages: g.languages,
      experienceYears: g.experienceYears,
      dailyRate: toNumber(g.dailyRate),
      currency: g.currency,
      city: g.city,
      country: g.country,
      status: g.status,
      updatedAt: g.updatedAt,
      attachedPackages: g.packageGuides.map((pg) => pg.package),
    })),
    ...pageMeta(total, page),
  };
}
