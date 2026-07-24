import type { HotelCategory, RoomTypeKind, PackageDifficulty } from "@prisma/client";

import type { Locale } from "@/shared/i18n/dictionary";

/**
 * Display labels for the fixed-choice fields an admin picks from a
 * `<Select>` rather than types freely (difficulty, hotel category, room
 * type, cabin class) — these are stored as their English constant
 * ("MODERATE", "BUSINESS"...), never as admin-authored text, so they can't
 * go through the `xxxFr` content-localization system. A visitor must still
 * see them in their own language, so each gets a real AR/FR label here
 * instead of the raw constant leaking onto the page.
 *
 * Kept separate from `dictionary.ts` (which stays Prisma-free by design)
 * since these keys come straight from Prisma enums.
 */
export const packageDifficultyLabels: Record<Locale, Record<PackageDifficulty, string>> = {
  ar: {
    EASY: "سهلة",
    MODERATE: "متوسطة",
    CHALLENGING: "صعبة",
    EXTREME: "شاقة جدًا",
  },
  fr: {
    EASY: "Facile",
    MODERATE: "Modéré",
    CHALLENGING: "Difficile",
    EXTREME: "Extrême",
  },
};

export const hotelCategoryLabels: Record<Locale, Record<HotelCategory, string>> = {
  ar: {
    BUDGET: "اقتصادي",
    STANDARD: "قياسي",
    BOUTIQUE: "بوتيك",
    LUXURY: "فاخر",
    RESORT: "منتجع",
    RIAD: "رياض",
    GUESTHOUSE: "بيت ضيافة",
    HOSTEL: "نُزل",
  },
  fr: {
    BUDGET: "Économique",
    STANDARD: "Standard",
    BOUTIQUE: "Boutique",
    LUXURY: "Luxe",
    RESORT: "Complexe",
    RIAD: "Riad",
    GUESTHOUSE: "Maison d'hôtes",
    HOSTEL: "Auberge",
  },
};

export const roomTypeKindLabels: Record<Locale, Record<RoomTypeKind, string>> = {
  ar: {
    STANDARD: "قياسية",
    DELUXE: "ديلوكس",
    SUITE: "جناح",
    FAMILY: "عائلية",
    CUSTOM: "مخصصة",
  },
  fr: {
    STANDARD: "Standard",
    DELUXE: "Deluxe",
    SUITE: "Suite",
    FAMILY: "Familiale",
    CUSTOM: "Personnalisée",
  },
};

export const CABIN_CLASSES = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] as const;
export type CabinClass = (typeof CABIN_CLASSES)[number];

export const cabinClassLabels: Record<Locale, Record<CabinClass, string>> = {
  ar: {
    ECONOMY: "اقتصادية",
    PREMIUM_ECONOMY: "اقتصادية مميزة",
    BUSINESS: "رجال الأعمال",
    FIRST: "الدرجة الأولى",
  },
  fr: {
    ECONOMY: "Économique",
    PREMIUM_ECONOMY: "Économique Premium",
    BUSINESS: "Affaires",
    FIRST: "Première",
  },
};
