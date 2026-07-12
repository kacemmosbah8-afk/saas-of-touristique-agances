import { z } from "zod";

export const DOCUMENT_CATEGORIES = [
  "IMAGE",
  "PDF",
  "PASSPORT",
  "VISA",
  "INVOICE",
  "CONTRACT",
  // M4 Sprint 4 — traveller document types
  "INSURANCE",
  "NATIONAL_ID",
  "VACCINATION",
  "OTHER",
] as const;

export const DOCUMENT_CATEGORY_LABELS: Record<(typeof DOCUMENT_CATEGORIES)[number], string> = {
  IMAGE: "Image",
  PDF: "PDF",
  PASSPORT: "Passport",
  VISA: "Visa",
  INVOICE: "Invoice",
  CONTRACT: "Contract",
  INSURANCE: "Travel insurance",
  NATIONAL_ID: "National ID",
  VACCINATION: "Vaccination certificate",
  OTHER: "Other",
};

export const createDocumentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  category: z.enum(DOCUMENT_CATEGORIES),
  fileKey: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string().max(100).optional(),
  sizeBytes: z.number().int().min(0).optional(),
  ownerType: z.string().max(40).optional(),
  ownerId: z.string().max(64).optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  category: z.enum(DOCUMENT_CATEGORIES),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

export const replaceDocumentFileSchema = z.object({
  fileKey: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string().max(100).optional(),
  sizeBytes: z.number().int().min(0).optional(),
});
export type ReplaceDocumentFileInput = z.infer<typeof replaceDocumentFileSchema>;

export const listDocumentsFiltersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  category: z.enum(DOCUMENT_CATEGORIES).or(z.literal("all")).optional(),
  sort: z.enum(["newest", "oldest", "name_asc", "name_desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});
export type ListDocumentsFilters = z.infer<typeof listDocumentsFiltersSchema>;
