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

export const activityFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
  slug: slugSchema,
  featured: z.boolean().optional(),
  category: optionalText(100),
  durationMinutes: z.number().int().min(1).max(20_160).optional(),
  meetingPoint: optionalText(300),
  description: optionalText(5000),
  includedItems: z.array(z.string().trim().max(200)).max(50).optional(),
  excludedItems: z.array(z.string().trim().max(200)).max(50).optional(),
  country: optionalText(100),
  city: optionalText(100),
  supplierId: z.string().cuid().optional().or(z.literal("")),
  internalCost: z.number().min(0).max(1_000_000).optional(),
  sellingPrice: z.number().min(0).max(1_000_000).optional(),
  currency: z.string().trim().length(3, "Use a 3-letter code").toUpperCase(),
});
export type ActivityFormInput = z.infer<typeof activityFormSchema>;

export const updateActivityStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});
export type UpdateActivityStatusInput = z.infer<typeof updateActivityStatusSchema>;

export const activityCoverSchema = z.object({
  fileKey: z.string().min(1),
  url: z.string().url(),
});
export type ActivityCoverInput = z.infer<typeof activityCoverSchema>;

export const activityImageSchema = z.object({
  fileKey: z.string().min(1),
  url: z.string().url(),
  alt: z.string().max(200).optional(),
});
export type ActivityImageInput = z.infer<typeof activityImageSchema>;

export const listActivitiesFiltersSchema = baseListFiltersSchema;
export type ListActivitiesFilters = z.infer<typeof listActivitiesFiltersSchema>;
