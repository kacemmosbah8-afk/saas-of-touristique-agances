import type { HotelCategory, RoomTypeKind } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type PublicHotelRoomType = {
  id: string;
  kind: RoomTypeKind;
  name: string;
  nameFr: string | null;
  capacity: number;
  beds: number | null;
  occupancy: number | null;
  basePrice: number | null;
  currency: string;
  images: string[];
  notes: string | null;
  notesFr: string | null;
};

export type PublicHotelImage = {
  id: string;
  url: string;
  alt: string | null;
  altFr: string | null;
};

/**
 * Public storefront shape — deliberately narrower than `HotelDetail`: no
 * `internalNotes`, no `roomTypes[].internalCost`. Only ever returns an
 * `ACTIVE` hotel; an inactive/archived/unknown slug returns `null`.
 */
export type PublicHotelDetail = {
  id: string;
  name: string;
  nameFr: string | null;
  slug: string;
  featured: boolean;
  category: HotelCategory;
  stars: number | null;
  country: string | null;
  countryFr: string | null;
  city: string | null;
  cityFr: string | null;
  address: string | null;
  addressFr: string | null;
  description: string | null;
  descriptionFr: string | null;
  amenities: string[];
  amenitiesFr: string[];
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
      nameFr: true,
      slug: true,
      featured: true,
      category: true,
      stars: true,
      country: true,
      countryFr: true,
      city: true,
      cityFr: true,
      address: true,
      addressFr: true,
      description: true,
      descriptionFr: true,
      amenities: true,
      amenitiesFr: true,
      coverImageUrl: true,
      images: {
        select: { id: true, url: true, alt: true, altFr: true },
        orderBy: { position: "asc" },
      },
      roomTypes: {
        select: {
          id: true,
          kind: true,
          name: true,
          nameFr: true,
          capacity: true,
          beds: true,
          occupancy: true,
          basePrice: true,
          currency: true,
          images: true,
          notes: true,
          notesFr: true,
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
