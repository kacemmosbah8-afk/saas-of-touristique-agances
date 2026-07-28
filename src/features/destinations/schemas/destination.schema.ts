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

const popularAttractionsSchema = z.array(z.string().trim().max(150)).max(50).optional();

export const destinationDetailsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
  nameFr: optionalText(150),
  slug: slugSchema,
  featured: z.boolean().optional(),
  country: z.string().trim().min(1, "Country is required").max(100, "Too long"),
  countryFr: optionalText(100),
  region: optionalText(100),
  regionFr: optionalText(100),
  city: optionalText(100),
  cityFr: optionalText(100),
  description: optionalText(5000),
  descriptionFr: optionalText(5000),
  popularAttractions: popularAttractionsSchema,
  popularAttractionsFr: popularAttractionsSchema,
});
export type DestinationDetailsInput = z.infer<typeof destinationDetailsSchema>;

export const destinationSeoSchema = z.object({
  seoTitle: z.string().trim().max(60, "SEO title should be under 60 characters").optional().or(z.literal("")),
  seoTitleFr: z.string().trim().max(60, "SEO title should be under 60 characters").optional().or(z.literal("")),
  seoDescription: z
    .string()
    .trim()
    .max(160, "SEO description should be under 160 characters")
    .optional()
    .or(z.literal("")),
  seoDescriptionFr: z
    .string()
    .trim()
    .max(160, "SEO description should be under 160 characters")
    .optional()
    .or(z.literal("")),
});
export type DestinationSeoInput = z.infer<typeof destinationSeoSchema>;

export const updateDestinationStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});
export type UpdateDestinationStatusInput = z.infer<typeof updateDestinationStatusSchema>;

export const destinationCoverSchema = z.object({
  fileKey: z.string().min(1),
  url: z.string().url(),
});
export type DestinationCoverInput = z.infer<typeof destinationCoverSchema>;

export const destinationImageSchema = z.object({
  fileKey: z.string().min(1),
  url: z.string().url(),
  alt: z.string().max(200).optional(),
});
export type DestinationImageInput = z.infer<typeof destinationImageSchema>;

/**
 * Create-only: lets the new-destination form collect a hero image and
 * gallery before the destination exists, uploaded to Supabase Storage
 * already but not yet attached to any record — attached in the same call
 * that creates it.
 */
export const createDestinationWithMediaSchema = destinationDetailsSchema.extend({
  coverImage: destinationCoverSchema.nullable().optional(),
  images: z.array(destinationImageSchema).optional(),
});
export type CreateDestinationWithMediaInput = z.infer<typeof createDestinationWithMediaSchema>;

export const listDestinationsFiltersSchema = baseListFiltersSchema;
export type ListDestinationsFilters = z.infer<typeof listDestinationsFiltersSchema>;
