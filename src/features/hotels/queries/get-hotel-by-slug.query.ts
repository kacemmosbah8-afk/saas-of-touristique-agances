import type { HotelCategory, RoomTypeKind } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type PublicHotelRoomType = {
  id: string;
  kind: RoomTypeKind;
  name: string;
  capacity: number;
  beds: number | null;
  occupancy: number | null;
  basePrice: number | null;
  currency: string;
  images: string[];
};

export type PublicHotelImage = { id: string; url: string; alt: string | null };

/**
 * Public storefront shape — deliberately narrower than `HotelDetail`: no
 * `internalNotes`, no `roomTypes[].internalCost`. Only ever returns an
 * `ACTIVE` hotel; an inactive/archived/unknown slug returns `null`.
 */
export type PublicHotelDetail = {
  id: string;
  name: string;
  slug: string;
  featured: boolean;
  category: HotelCategory;
  stars: number | null;
  country: string | null;
  city: string | null;
  address: string | null;
  description: string | null;
  amenities: string[];
  coverImageUrl: string | null;
  images: PublicHotelImage[];
  roomTypes: PublicHotelRoomType[];
};

export async function getHotelBySlug(
  db: TenantDb,
  slug: string,
): Promise<PublicHotelDetail | null> {
  const hotel = await db.hotel.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      featured: true,
      category: true,
      stars: true,
      country: true,
      city: true,
      address: true,
      description: true,
      amenities: true,
      coverImageUrl: true,
      images: {
        select: { id: true, url: true, alt: true },
        orderBy: { position: "asc" },
      },
      roomTypes: {
        select: {
          id: true,
          kind: true,
          name: true,
          capacity: true,
          beds: true,
          occupancy: true,
          basePrice: true,
          currency: true,
          images: true,
        },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!hotel) return null;

  return {
    ...hotel,
    roomTypes: hotel.roomTypes.map((r) => ({ ...r, basePrice: toNumber(r.basePrice) })),
  };
}
