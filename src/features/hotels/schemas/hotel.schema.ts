import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";

export const HOTEL_CATEGORIES = [
  "BUDGET",
  "STANDARD",
  "BOUTIQUE",
  "LUXURY",
  "RESORT",
  "RIAD",
  "GUESTHOUSE",
  "HOSTEL",
] as const;

export const ROOM_TYPE_KINDS = [
  "STANDARD",
  "DELUXE",
  "SUITE",
  "FAMILY",
  "CUSTOM",
] as const;

const optionalText = (max: number, msg = "Too long") =>
  z.string().trim().max(max, msg).optional().or(z.literal(""));

const optionalEmail = z
  .string()
  .trim()
  .email("Invalid email")
  .optional()
  .or(z.literal(""));

// ---------------------------------------------------------------------------
// Hotel create / update
// ---------------------------------------------------------------------------

export const hotelFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
  category: z.enum(HOTEL_CATEGORIES),
  stars: z.number().int().min(1, "Min 1 star").max(5, "Max 5 stars").optional(),
  country: optionalText(100),
  city: optionalText(100),
  address: optionalText(300),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  description: optionalText(5000),
  amenities: z.array(z.string().trim().max(80)).max(60).optional(),
  contactName: optionalText(120),
  contactEmail: optionalEmail,
  contactPhone: optionalText(40),
  website: optionalText(200),
  internalNotes: optionalText(2000),
});

export type HotelFormInput = z.infer<typeof hotelFormSchema>;

// ---------------------------------------------------------------------------
// Status + media
// ---------------------------------------------------------------------------

export const updateHotelStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});
export type UpdateHotelStatusInput = z.infer<typeof updateHotelStatusSchema>;

export const hotelCoverSchema = z.object({
  fileKey: z.string().min(1),
  url: z.string().url(),
});
export type HotelCoverInput = z.infer<typeof hotelCoverSchema>;

export const hotelImageSchema = z.object({
  fileKey: z.string().min(1),
  url: z.string().url(),
  alt: z.string().max(200).optional(),
});
export type HotelImageInput = z.infer<typeof hotelImageSchema>;

// ---------------------------------------------------------------------------
// Room types
// ---------------------------------------------------------------------------

export const roomTypeFormSchema = z.object({
  kind: z.enum(ROOM_TYPE_KINDS),
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  capacity: z.number().int().min(1, "Min 1").max(30, "Max 30"),
  beds: z.number().int().min(0).max(20).optional(),
  occupancy: z.number().int().min(1).max(30).optional(),
  basePrice: z.number().min(0).max(1_000_000).optional(),
  internalCost: z.number().min(0).max(1_000_000).optional(),
  currency: z.string().trim().length(3, "Use a 3-letter code").toUpperCase(),
  images: z.array(z.string().url()).max(6).optional(),
  notes: optionalText(1000),
});
export type RoomTypeFormInput = z.infer<typeof roomTypeFormSchema>;

// ---------------------------------------------------------------------------
// List filters
// ---------------------------------------------------------------------------

export const listHotelsFiltersSchema = baseListFiltersSchema.extend({
  category: z.enum(HOTEL_CATEGORIES).or(z.literal("all")).optional(),
  stars: z.coerce.number().int().min(1).max(5).or(z.literal("all")).optional(),
});
export type ListHotelsFilters = z.infer<typeof listHotelsFiltersSchema>;
