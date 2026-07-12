import type { HotelCategory, ResourceStatus, RoomTypeKind } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type HotelRoomType = {
  id: string;
  kind: RoomTypeKind;
  name: string;
  capacity: number;
  beds: number | null;
  occupancy: number | null;
  basePrice: number | null;
  internalCost: number | null;
  currency: string;
  images: string[];
  notes: string | null;
  position: number;
};

export type HotelImageItem = { id: string; url: string; alt: string | null };

export type HotelDetail = {
  id: string;
  name: string;
  category: HotelCategory;
  stars: number | null;
  country: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  amenities: string[];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  internalNotes: string | null;
  coverImageUrl: string | null;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
  images: HotelImageItem[];
  roomTypes: HotelRoomType[];
};

export async function getHotel(
  db: TenantDb,
  hotelId: string,
): Promise<HotelDetail | null> {
  const hotel = await db.hotel.findFirst({
    where: { id: hotelId, deletedAt: null },
    include: {
      images: { orderBy: { position: "asc" } },
      roomTypes: { orderBy: { position: "asc" } },
    },
  });

  if (!hotel) return null;

  return {
    id: hotel.id,
    name: hotel.name,
    category: hotel.category,
    stars: hotel.stars,
    country: hotel.country,
    city: hotel.city,
    address: hotel.address,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    description: hotel.description,
    amenities: hotel.amenities,
    contactName: hotel.contactName,
    contactEmail: hotel.contactEmail,
    contactPhone: hotel.contactPhone,
    website: hotel.website,
    internalNotes: hotel.internalNotes,
    coverImageUrl: hotel.coverImageUrl,
    status: hotel.status,
    createdAt: hotel.createdAt,
    updatedAt: hotel.updatedAt,
    images: hotel.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
    roomTypes: hotel.roomTypes.map((r) => ({
      id: r.id,
      kind: r.kind,
      name: r.name,
      capacity: r.capacity,
      beds: r.beds,
      occupancy: r.occupancy,
      basePrice: toNumber(r.basePrice),
      internalCost: toNumber(r.internalCost),
      currency: r.currency,
      images: r.images,
      notes: r.notes,
      position: r.position,
    })),
  };
}
