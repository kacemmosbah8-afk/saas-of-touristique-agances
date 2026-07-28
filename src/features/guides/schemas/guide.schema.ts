import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";

const optionalText = (max: number) =>
  z.string().trim().max(max, "Too long").optional().or(z.literal(""));

export const guideFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
  languages: z.array(z.string().trim().max(40)).max(30).optional(),
  certifications: z.array(z.string().trim().max(120)).max(30).optional(),
  experienceYears: z.number().int().min(0).max(80).optional(),
  dailyRate: z.number().min(0).max(1_000_000).optional(),
  currency: z.string().trim().length(3, "Use a 3-letter code").toUpperCase(),
  country: optionalText(100),
  city: optionalText(100),
  contactEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  contactPhone: optionalText(40),
  availabilityNotes: optionalText(2000),
  internalNotes: optionalText(2000),
});
export type GuideFormInput = z.infer<typeof guideFormSchema>;

export const updateGuideStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});
export type UpdateGuideStatusInput = z.infer<typeof updateGuideStatusSchema>;

export const listGuidesFiltersSchema = baseListFiltersSchema;
export type ListGuidesFilters = z.infer<typeof listGuidesFiltersSchema>;
