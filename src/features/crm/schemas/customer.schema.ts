import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";

export const CUSTOMER_TYPES = ["INDIVIDUAL", "CORPORATE", "AGENCY", "VIP"] as const;
export const CUSTOMER_TYPE_LABELS: Record<(typeof CUSTOMER_TYPES)[number], string> = {
  INDIVIDUAL: "Individual",
  CORPORATE: "Corporate",
  AGENCY: "Agency",
  VIP: "VIP",
};

export const LEAD_SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "ADVERTISING",
  "WALK_IN",
  "PHONE",
  "EMAIL",
  "PARTNER",
  "OTHER",
] as const;
export const LEAD_SOURCE_LABELS: Record<(typeof LEAD_SOURCES)[number], string> = {
  WEBSITE: "Website",
  REFERRAL: "Referral",
  SOCIAL_MEDIA: "Social Media",
  ADVERTISING: "Advertising",
  WALK_IN: "Walk-in",
  PHONE: "Phone",
  EMAIL: "Email",
  PARTNER: "Partner",
  OTHER: "Other",
};

export const COMMUNICATION_PREFERENCES = ["EMAIL", "PHONE", "SMS", "WHATSAPP", "NONE"] as const;
export const COMMUNICATION_PREFERENCE_LABELS: Record<
  (typeof COMMUNICATION_PREFERENCES)[number],
  string
> = {
  EMAIL: "Email",
  PHONE: "Phone",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  NONE: "Do not contact",
};

const optionalText = (max: number) =>
  z.string().trim().max(max, "Too long").optional().or(z.literal(""));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date");

export const customerFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: optionalText(40),
  type: z.enum(CUSTOMER_TYPES),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  leadSource: z.enum(LEAD_SOURCES).optional().or(z.literal("")),
  communicationPreference: z.enum(COMMUNICATION_PREFERENCES),
  dateOfBirth: optionalDate,
  nationality: optionalText(80),
  passportNumber: optionalText(60),
  passportExpiry: optionalDate,
  companyId: z.string().cuid().optional().or(z.literal("")),
  ownerId: z.string().optional().or(z.literal("")),
  notes: optionalText(5000),
});
export type CustomerFormInput = z.infer<typeof customerFormSchema>;

export const updateCustomerStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});
export type UpdateCustomerStatusInput = z.infer<typeof updateCustomerStatusSchema>;

export const customerNoteSchema = z.object({
  body: z.string().trim().min(1, "Note is required").max(5000),
});
export type CustomerNoteInput = z.infer<typeof customerNoteSchema>;

export const contactFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: optionalText(40),
  role: optionalText(80),
  isPrimary: z.boolean().optional(),
});
export type ContactFormInput = z.infer<typeof contactFormSchema>;

export const addressFormSchema = z.object({
  label: optionalText(60),
  line1: z.string().trim().min(1, "Address line is required").max(200),
  line2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  postalCode: optionalText(30),
  country: optionalText(100),
  isPrimary: z.boolean().optional(),
});
export type AddressFormInput = z.infer<typeof addressFormSchema>;

export const duplicateCheckSchema = z.object({
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});
export type DuplicateCheckInput = z.infer<typeof duplicateCheckSchema>;

export const listCustomersFiltersSchema = baseListFiltersSchema.extend({
  type: z.enum(CUSTOMER_TYPES).or(z.literal("all")).optional(),
  source: z.enum(LEAD_SOURCES).or(z.literal("all")).optional(),
});
export type ListCustomersFilters = z.infer<typeof listCustomersFiltersSchema>;
