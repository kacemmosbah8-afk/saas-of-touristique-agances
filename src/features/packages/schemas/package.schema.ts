import { z } from "zod";

export const packageSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------
// Create (minimal — name + slug only required at creation)
// ---------------------------------------------------------------------------

export const createPackageSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug is too long")
    .regex(packageSlugRegex, "Only lowercase letters, numbers, and hyphens — no leading/trailing hyphens"),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;

// ---------------------------------------------------------------------------
// Details tab
// ---------------------------------------------------------------------------

export const updatePackageDetailsSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  nameFr: z.string().max(100, "Name is too long").optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug is too long")
    .regex(packageSlugRegex, "Only lowercase letters, numbers, and hyphens"),
  shortDescription: z.string().max(300, "Short description is too long").optional(),
  shortDescriptionFr: z.string().max(300, "Short description is too long").optional(),
  description: z.string().max(10000, "Description is too long").optional(),
  descriptionFr: z.string().max(10000, "Description is too long").optional(),
  destination: z.string().max(100, "Destination is too long").optional(),
  destinationFr: z.string().max(100, "Destination is too long").optional(),
  country: z.string().max(100, "Country is too long").optional(),
  countryFr: z.string().max(100, "Country is too long").optional(),
  duration: z
    .number()
    .int("Must be a whole number")
    .min(1, "Minimum 1 day")
    .max(365, "Maximum 365 days")
    .optional(),
  durationNights: z
    .number()
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .max(365, "Maximum 365 nights")
    .optional(),
  category: z.string().max(100, "Category is too long").optional(),
  categoryFr: z.string().max(100, "Category is too long").optional(),
  difficulty: z.enum(["EASY", "MODERATE", "CHALLENGING", "EXTREME"]).optional(),
  featured: z.boolean().optional(),
  internalCost: z.number().min(0, "Cannot be negative").max(1_000_000).optional(),
  sellingPrice: z.number().min(0, "Cannot be negative").max(1_000_000).optional(),
  currency: z.string().trim().length(3, "Use a 3-letter code").toUpperCase(),
});

export type UpdatePackageDetailsInput = z.infer<typeof updatePackageDetailsSchema>;

// ---------------------------------------------------------------------------
// Builder tab
// ---------------------------------------------------------------------------

const stringArraySchema = z.array(z.string().max(500, "Item too long")).max(50, "Too many items");

export const updatePackageBuilderSchema = z.object({
  highlights: stringArraySchema.optional(),
  highlightsFr: stringArraySchema.optional(),
  includedServices: stringArraySchema.optional(),
  includedServicesFr: stringArraySchema.optional(),
  excludedServices: stringArraySchema.optional(),
  excludedServicesFr: stringArraySchema.optional(),
  importantNotes: stringArraySchema.optional(),
  importantNotesFr: stringArraySchema.optional(),
  whatToBring: stringArraySchema.optional(),
  whatToBringFr: stringArraySchema.optional(),
  cancellationPolicy: z.string().max(5000, "Too long").optional(),
  cancellationPolicyFr: z.string().max(5000, "Too long").optional(),
  meetingPoint: z.string().max(500, "Too long").optional(),
  meetingPointFr: z.string().max(500, "Too long").optional(),
});

export type UpdatePackageBuilderInput = z.infer<typeof updatePackageBuilderSchema>;

// ---------------------------------------------------------------------------
// SEO tab
// ---------------------------------------------------------------------------

export const updatePackageSeoSchema = z.object({
  seoTitle: z.string().max(60, "SEO title should be under 60 characters").optional(),
  seoTitleFr: z.string().max(60, "SEO title should be under 60 characters").optional(),
  seoDescription: z.string().max(160, "SEO description should be under 160 characters").optional(),
  seoDescriptionFr: z.string().max(160, "SEO description should be under 160 characters").optional(),
});

export type UpdatePackageSeoInput = z.infer<typeof updatePackageSeoSchema>;

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export const updatePackageStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

export type UpdatePackageStatusInput = z.infer<typeof updatePackageStatusSchema>;

// ---------------------------------------------------------------------------
// Cover image
// ---------------------------------------------------------------------------

export const updatePackageCoverSchema = z.object({
  fileKey: z.string().min(1),
  url: z.string().url(),
});

export type UpdatePackageCoverInput = z.infer<typeof updatePackageCoverSchema>;

// ---------------------------------------------------------------------------
// Gallery image
// ---------------------------------------------------------------------------

export const addGalleryImageSchema = z.object({
  fileKey: z.string().min(1),
  url: z.string().url(),
  alt: z.string().max(200).optional(),
  altFr: z.string().max(200).optional(),
});

export type AddGalleryImageInput = z.infer<typeof addGalleryImageSchema>;

// ---------------------------------------------------------------------------
// Create with media
// ---------------------------------------------------------------------------

/**
 * Create-only: lets the new-package form collect a cover image and gallery
 * before the package exists, uploaded to Supabase Storage already but not
 * yet attached to any record — attached in the same call that creates it.
 */
export const createPackageWithMediaSchema = createPackageSchema
  .extend({
    coverImage: updatePackageCoverSchema.nullable().optional(),
    images: z.array(addGalleryImageSchema).optional(),
  })
  .refine((d) => d.coverImage != null || (d.images?.length ?? 0) > 0, {
    message: "Add a picture before saving.",
    path: ["coverImage"],
  });
export type CreatePackageWithMediaInput = z.infer<typeof createPackageWithMediaSchema>;

// ---------------------------------------------------------------------------
// List filters
// ---------------------------------------------------------------------------

export const listPackagesFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "all"]).optional(),
  sort: z.enum(["newest", "oldest", "name_asc", "name_desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export type ListPackagesFilters = z.infer<typeof listPackagesFiltersSchema>;

// Keep legacy aliases so existing imports don't break during refactor
export const updatePackageSchema = updatePackageDetailsSchema;
export type UpdatePackageInput = UpdatePackageDetailsInput;
