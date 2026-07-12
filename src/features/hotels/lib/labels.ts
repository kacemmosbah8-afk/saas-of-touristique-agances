import type { HotelCategory, RoomTypeKind } from "@prisma/client";

export const HOTEL_CATEGORY_LABELS: Record<HotelCategory, string> = {
  BUDGET: "Budget",
  STANDARD: "Standard",
  BOUTIQUE: "Boutique",
  LUXURY: "Luxury",
  RESORT: "Resort",
  RIAD: "Riad",
  GUESTHOUSE: "Guesthouse",
  HOSTEL: "Hostel",
};

export const ROOM_TYPE_KIND_LABELS: Record<RoomTypeKind, string> = {
  STANDARD: "Standard",
  DELUXE: "Deluxe",
  SUITE: "Suite",
  FAMILY: "Family",
  CUSTOM: "Custom",
};
