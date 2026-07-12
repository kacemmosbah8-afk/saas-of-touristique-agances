import { z } from "zod";

export const packageSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createPackageSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug is too long")
    .regex(packageSlugRegex, "Only lowercase letters, numbers, and hyphens — no leading/trailing hyphens"),
  description: z.string().max(2000, "Description is too long").optional(),
  duration: z
    .number()
    .int("Duration must be a whole number")
    .min(1, "Minimum 1 day")
    .max(365, "Maximum 365 days")
    .optional(),
  destination: z.string().max(100, "Destination is too long").optional(),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const updatePackageSchema = createPackageSchema;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;

export const updatePackageStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});
export type UpdatePackageStatusInput = z.infer<typeof updatePackageStatusSchema>;
