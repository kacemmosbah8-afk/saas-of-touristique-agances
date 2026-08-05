import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";

const optionalText = (max: number) =>
  z.string().trim().max(max, "Too long").optional().or(z.literal(""));

const slugSchema = z
  .string()
  .trim()
  .min(1, "URL slug is required")
  .max(150, "Too long")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only");

export const CABIN_CLASSES = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] as const;

export const flightFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
  nameFr: optionalText(150),
  slug: slugSchema,
  featured: z.boolean().optional(),
  shortDescription: optionalText(300),
  shortDescriptionFr: optionalText(300),
  description: optionalText(5000),
  descriptionFr: optionalText(5000),
  airline: optionalText(120),
  flightNumber: optionalText(20),
  departureCity: optionalText(100),
  departureCityFr: optionalText(100),
  departureAirport: optionalText(120),
  departureAirportFr: optionalText(120),
  departureCountry: optionalText(100),
  departureCountryFr: optionalText(100),
  arrivalCity: optionalText(100),
  arrivalCityFr: optionalText(100),
  arrivalAirport: optionalText(120),
  arrivalAirportFr: optionalText(120),
  arrivalCountry: optionalText(100),
  arrivalCountryFr: optionalText(100),
  departureTime: optionalText(20),
  arrivalTime: optionalText(20),
  durationMinutes: z.number().int().min(1).max(4320).optional(),
  stops: z.number().int().min(0).max(10).optional(),
  cabinClass: z.enum(CABIN_CLASSES).optional().or(z.literal("")),
  basePrice: z.number().min(0).max(1_000_000).optional(),
  currency: z.string().trim().length(3, "Use a 3-letter code").toUpperCase(),
});
export type FlightFormInput = z.infer<typeof flightFormSchema>;

export const updateFlightStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});
export type UpdateFlightStatusInput = z.infer<typeof updateFlightStatusSchema>;

export const flightCoverSchema = z.object({
  fileKey: z.string().min(1),
  url: z.string().url(),
});
export type FlightCoverInput = z.infer<typeof flightCoverSchema>;

export const flightImageSchema = z.object({
  fileKey: z.string().min(1),
  url: z.string().url(),
  alt: z.string().max(200).optional(),
});
export type FlightImageInput = z.infer<typeof flightImageSchema>;

/**
 * Create-only: lets the new-flight form collect a cover image and gallery
 * before the flight exists, uploaded to Supabase Storage already but not
 * yet attached to any record — attached in the same call that creates it.
 */
export const createFlightWithMediaSchema = flightFormSchema
  .extend({
    coverImage: flightCoverSchema.nullable().optional(),
    images: z.array(flightImageSchema).optional(),
  })
  .refine((d) => d.coverImage != null || (d.images?.length ?? 0) > 0, {
    message: "Add a picture before saving.",
    path: ["coverImage"],
  });
export type CreateFlightWithMediaInput = z.infer<typeof createFlightWithMediaSchema>;

export const listFlightsFiltersSchema = baseListFiltersSchema.extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "all"]).optional(),
});
export type ListFlightsFilters = z.infer<typeof listFlightsFiltersSchema>;
