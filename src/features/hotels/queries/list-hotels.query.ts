import type { Prisma } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { buildNameSort, paginate, pageMeta, toNumber } from "@/shared/lib/list-query";
import { statusWhere } from "@/shared/schemas/list.schema";
import type { ListHotelsFilters } from "@/features/hotels/schemas/hotel.schema";

export type HotelSummary = {
  id: string;
  name: string;
  nameFr: string | null;
  slug: string;
  featured: boolean;
  category: string;
  stars: number | null;
  country: string | null;
  countryFr: string | null;
  city: string | null;
  cityFr: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  coverImageUrl: string | null;
  roomTypeCount: number;
  /** Lowest room-type nightly rate, so the listing card can show a real
   * starting price instead of forcing every visitor to click in blind. */
  fromPrice: { amount: number; currency: string } | null;
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
        nameFr: true,
        slug: true,
        featured: true,
        category: true,
        stars: true,
        country: true,
        countryFr: true,
        city: true,
        cityFr: true,
        status: true,
        coverImageUrl: true,
        updatedAt: true,
        _count: { select: { roomTypes: true } },
        roomTypes: { select: { basePrice: true, currency: true } },
      },
      orderBy: buildNameSort(sort),
      skip,
      take,
    }),
    db.hotel.count({ where }),
  ]);

  return {
    hotels: hotels.map((h) => {
      const prices = h.roomTypes
        .map((r) => ({ amount: toNumber(r.basePrice), currency: r.currency }))
        .filter((r): r is { amount: number; currency: string } => r.amount != null)
        .sort((a, b) => a.amount - b.amount);

      return {
        id: h.id,
        name: h.name,
        nameFr: h.nameFr,
        slug: h.slug,
        featured: h.featured,
        category: h.category,
        stars: h.stars,
        country: h.country,
        countryFr: h.countryFr,
        city: h.city,
        cityFr: h.cityFr,
        status: h.status,
        coverImageUrl: h.coverImageUrl,
        roomTypeCount: h._count.roomTypes,
        fromPrice: prices[0] ?? null,
        updatedAt: h.updatedAt,
      };
    }),
    ...pageMeta(total, page),
  };
}
