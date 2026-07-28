import type { TenantDb } from "@/shared/lib/db";
import type { ListPackagesFilters } from "@/features/packages/schemas/package.schema";
import { toNumber } from "@/shared/lib/list-query";

export type PackageSummary = {
  id: string;
  name: string;
  nameFr: string | null;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;
  shortDescription: string | null;
  shortDescriptionFr: string | null;
  destination: string | null;
  destinationFr: string | null;
  country: string | null;
  countryFr: string | null;
  duration: number | null;
  durationNights: number | null;
  category: string | null;
  sellingPrice: number | null;
  currency: string;
  coverImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PackageListResult = {
  packages: PackageSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const PAGE_SIZE = 25;

export async function listPackages(
  db: TenantDb,
  filters: ListPackagesFilters = {},
): Promise<PackageListResult> {
  const { search, status, sort = "newest", page = 1 } = filters;

  const where = {
    deletedAt: null,
    ...(status && status !== "all" ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { destination: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" as const }
      : sort === "name_asc"
        ? { name: "asc" as const }
        : sort === "name_desc"
          ? { name: "desc" as const }
          : { createdAt: "desc" as const };

  const skip = (page - 1) * PAGE_SIZE;

  const [packages, total] = await Promise.all([
    db.package.findMany({
      where,
      select: {
        id: true,
        name: true,
        nameFr: true,
        slug: true,
        status: true,
        featured: true,
        shortDescription: true,
        shortDescriptionFr: true,
        destination: true,
        destinationFr: true,
        country: true,
        countryFr: true,
        duration: true,
        durationNights: true,
        category: true,
        sellingPrice: true,
        currency: true,
        coverImageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      skip,
      take: PAGE_SIZE,
    }),
    db.package.count({ where }),
  ]);

  return {
    packages: packages.map((p) => ({ ...p, sellingPrice: toNumber(p.sellingPrice) })),
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.ceil(total / PAGE_SIZE),
  };
}
