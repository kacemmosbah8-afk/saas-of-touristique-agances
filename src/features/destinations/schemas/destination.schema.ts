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

export const destinationDetailsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
  slug: slugSchema,
  featured: z.boolean().optional(),
  country: z.string().trim().min(1, "Country is required").max(100, "Too long"),
  region: optionalText(100),
  city: optionalText(100),
  description: optionalText(5000),
  popularAttractions: z.array(z.string().trim().max(150)).max(50).optional(),
});
export type DestinationDetailsInput = z.infer<typeof destinationDetailsSchema>;

export const destinationSeoSchema = z.object({
  seoTitle: z.string().trim().max(60, "SEO title should be under 60 characters").optional().or(z.literal("")),
  seoDescription: z
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

export const listDestinationsFiltersSchema = baseListFiltersSchema;
export type ListDestinationsFilters = z.infer<typeof listDestinationsFiltersSchema>;
