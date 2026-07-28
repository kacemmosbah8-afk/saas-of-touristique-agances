import type { HotelCategory, RoomTypeKind } from "@prisma/client";

export const HOTEL_CATEGORY_LABELS: Record<HotelCategory, string> = {
  BUDGET: "اقتصادي",
  STANDARD: "قياسي",
  BOUTIQUE: "بوتيك",
  LUXURY: "فاخر",
  RESORT: "منتجع",
  RIAD: "رياض",
  GUESTHOUSE: "بيت ضيافة",
  HOSTEL: "نُزل",
};

export const ROOM_TYPE_KIND_LABELS: Record<RoomTypeKind, string> = {
  STANDARD: "قياسية",
  DELUXE: "ديلوكس",
  SUITE: "جناح",
  FAMILY: "عائلية",
  CUSTOM: "مخصصة",
};
