import { z } from "zod";

// ---------------------------------------------------------------------------
// General workspace settings
// ---------------------------------------------------------------------------

export const generalSettingsSchema = z.object({
  defaultCurrency: z.string().trim().length(3, "Use a 3-letter code").toUpperCase(),
  defaultLanguage: z.string().trim().min(2).max(10),
  defaultTimezone: z.string().trim().min(1).max(60),
  defaultCountry: z.string().trim().max(2).optional().or(z.literal("")),
});
export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;

// ---------------------------------------------------------------------------
// Per-module settings, stored in TenantSettings JSON columns. Each has a Zod
// schema so reads/writes stay typed even though the storage is JSON.
// ---------------------------------------------------------------------------

export const crmSettingsSchema = z.object({
  duplicateCheckEnabled: z.boolean().default(true),
  defaultCustomerType: z.enum(["INDIVIDUAL", "CORPORATE", "AGENCY", "VIP"]).default("INDIVIDUAL"),
});
export type CrmSettings = z.infer<typeof crmSettingsSchema>;

export const leadSettingsSchema = z.object({
  staleAfterDays: z.number().int().min(1).max(365).default(14),
  requireLostReason: z.boolean().default(true),
});
export type LeadSettings = z.infer<typeof leadSettingsSchema>;

export const supplierSettingsSchema = z.object({
  defaultCommissionRate: z.number().min(0).max(100).default(10),
  requireContracts: z.boolean().default(false),
});
export type SupplierSettings = z.infer<typeof supplierSettingsSchema>;

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #0ea5e9");

export const profileSocialLinksSchema = z.object({
  facebook: z.string().trim().url().optional().or(z.literal("")),
  instagram: z.string().trim().url().optional().or(z.literal("")),
  twitter: z.string().trim().url().optional().or(z.literal("")),
  linkedin: z.string().trim().url().optional().or(z.literal("")),
  tiktok: z.string().trim().url().optional().or(z.literal("")),
  youtube: z.string().trim().url().optional().or(z.literal("")),
});
export type ProfileSocialLinks = z.infer<typeof profileSocialLinksSchema>;

/**
 * The agency's public profile — everything the public storefront needs to
 * render its own identity instead of TravelOS's. Nothing here has a
 * TravelOS-owned default: every field is optional, and an unset field must
 * render as an empty state on the public site, never a placeholder.
 */
export const profileSettingsSchema = z.object({
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  // French translations of the two hero-facing fields above — Arabic (the
  // bare fields) is this storefront's primary language; French is the one
  // secondary language a visitor can switch to. See PROJECT.md's bilingual
  // content sprint. Every other public-facing model (Package, Hotel,
  // Destination, Activity, Flight) follows this same bare-field-is-Arabic,
  // `Fr`-suffix-is-French convention.
  taglineFr: z.string().trim().max(200).optional().or(z.literal("")),
  descriptionFr: z.string().trim().max(4000).optional().or(z.literal("")),
  /** Whether this tenant's public site exposes the French language switch at all. */
  frenchEnabled: z.boolean().default(false),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  primaryColor: hexColor.optional().or(z.literal("")),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  addressFr: z.string().trim().max(300).optional().or(z.literal("")),
  businessHours: z.string().trim().max(500).optional().or(z.literal("")),
  businessHoursFr: z.string().trim().max(500).optional().or(z.literal("")),
  socialLinks: profileSocialLinksSchema.default({}),
  // Real client quotes only, entered by the agency — never TravelOS-authored
  // placeholder copy. Each string is a self-contained quote (attribution
  // included inline, e.g. `"Amazing trip!" — Sarah M.`) so it reuses the
  // same plain string-list editor as highlights/amenities elsewhere.
  testimonials: z.array(z.string().trim().min(1).max(400)).max(12).default([]),
  // Same fallback-to-Arabic convention as every other Fr field — matched by
  // position, not by any stable id, since a plain string list has none.
  testimonialsFr: z.array(z.string().trim().min(1).max(400)).max(12).default([]),
});
export type ProfileSettings = z.infer<typeof profileSettingsSchema>;

export const moduleSettingsSchema = z.discriminatedUnion("module", [
  z.object({ module: z.literal("crm"), settings: crmSettingsSchema }),
  z.object({ module: z.literal("lead"), settings: leadSettingsSchema }),
  z.object({ module: z.literal("supplier"), settings: supplierSettingsSchema }),
  z.object({ module: z.literal("profile"), settings: profileSettingsSchema }),
]);
export type ModuleSettingsInput = z.infer<typeof moduleSettingsSchema>;

// ---------------------------------------------------------------------------
// Tags / travel categories / custom fields
// ---------------------------------------------------------------------------

export const tagFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #0ea5e9"),
});
export type TagFormInput = z.infer<typeof tagFormSchema>;

export const travelCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
});
export type TravelCategoryFormInput = z.infer<typeof travelCategoryFormSchema>;

export const CUSTOM_FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT"] as const;
export const CUSTOM_FIELD_ENTITIES = ["customer", "lead", "supplier"] as const;

export const customFieldFormSchema = z
  .object({
    entity: z.enum(CUSTOM_FIELD_ENTITIES),
    label: z.string().trim().min(1, "Label is required").max(80),
    type: z.enum(CUSTOM_FIELD_TYPES),
    options: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    required: z.boolean().optional(),
  })
  .refine(
    (data) => data.type !== "SELECT" || (data.options?.length ?? 0) > 0,
    { message: "Select fields need at least one option", path: ["options"] },
  );
export type CustomFieldFormInput = z.infer<typeof customFieldFormSchema>;
