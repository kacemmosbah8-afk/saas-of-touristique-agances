import type { Prisma } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { buildNameSort, paginate, pageMeta } from "@/shared/lib/list-query";
import { statusWhere } from "@/shared/schemas/list.schema";
import type { ListHotelsFilters } from "@/features/hotels/schemas/hotel.schema";

export type HotelSummary = {
  id: string;
  name: string;
  slug: string;
  featured: boolean;
  category: string;
  stars: number | null;
  country: string | null;
  city: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  coverImageUrl: string | null;
  roomTypeCount: number;
  updatedAt: Date;
};

export type HotelListResult = {
  hotels: HotelSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listHotels(
  db: TenantDb,
  filters: ListHotelsFilters = {},
): Promise<HotelListResult> {
  const { search, status, sort, category, stars } = filters;
  const { page, skip, take } = paginate(filters.page);

  const where: Prisma.HotelWhereInput = {
    ...statusWhere(status),
    ...(category && category !== "all" ? { category } : {}),
    ...(typeof stars === "number" ? { stars } : {}),
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

  const [hotels, total] = await Promise.all([
    db.hotel.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        featured: true,
        category: true,
        stars: true,
        country: true,
        city: true,
        status: true,
        coverImageUrl: true,
        updatedAt: true,
        _count: { select: { roomTypes: true } },
      },
      orderBy: buildNameSort(sort),
      skip,
      take,
    }),
    db.hotel.count({ where }),
  ]);

  return {
    hotels: hotels.map((h) => ({
      id: h.id,
      name: h.name,
      slug: h.slug,
      featured: h.featured,
      category: h.category,
      stars: h.stars,
      country: h.country,
      city: h.city,
      status: h.status,
      coverImageUrl: h.coverImageUrl,
      roomTypeCount: h._count.roomTypes,
      updatedAt: h.updatedAt,
    })),
    ...pageMeta(total, page),
  };
}
