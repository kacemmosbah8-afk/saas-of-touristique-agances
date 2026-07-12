import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";

export const SUPPLIER_TYPES = [
  "HOTEL",
  "TRANSPORT",
  "ACTIVITY",
  "RESTAURANT",
  "GUIDE",
  "VISA",
  "INSURANCE",
  "OTHER",
] as const;

export const SUPPLIER_TYPE_LABELS: Record<(typeof SUPPLIER_TYPES)[number], string> = {
  HOTEL: "Hotel",
  TRANSPORT: "Transport",
  ACTIVITY: "Activity",
  RESTAURANT: "Restaurant",
  GUIDE: "Guide",
  VISA: "Visa",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

const optionalText = (max: number) =>
  z.string().trim().max(max, "Too long").optional().or(z.literal(""));

export const supplierFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
  type: z.enum(SUPPLIER_TYPES),
  contactName: optionalText(120),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: optionalText(40),
  website: optionalText(200),
  address: optionalText(300),
  country: optionalText(100),
  city: optionalText(100),
  paymentTerms: optionalText(300),
  internalRating: z.number().int().min(1).max(5).optional(),
  notes: optionalText(2000),
});
export type SupplierFormInput = z.infer<typeof supplierFormSchema>;

export const updateSupplierStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});
export type UpdateSupplierStatusInput = z.infer<typeof updateSupplierStatusSchema>;

export const addSupplierDocumentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  kind: z.enum(["contract", "document"]).default("document"),
  fileKey: z.string().min(1),
  url: z.string().url(),
});
export type AddSupplierDocumentInput = z.infer<typeof addSupplierDocumentSchema>;

export const listSuppliersFiltersSchema = baseListFiltersSchema.extend({
  type: z.enum(SUPPLIER_TYPES).or(z.literal("all")).optional(),
});
export type ListSuppliersFilters = z.infer<typeof listSuppliersFiltersSchema>;
