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

export const providerSettingsSchema = z.object({
  defaultEnvironment: z.enum(["SANDBOX", "PRODUCTION"]).default("SANDBOX"),
  healthCheckIntervalMinutes: z.number().int().min(5).max(1440).default(60),
});
export type ProviderSettings = z.infer<typeof providerSettingsSchema>;

export const moduleSettingsSchema = z.discriminatedUnion("module", [
  z.object({ module: z.literal("crm"), settings: crmSettingsSchema }),
  z.object({ module: z.literal("lead"), settings: leadSettingsSchema }),
  z.object({ module: z.literal("supplier"), settings: supplierSettingsSchema }),
  z.object({ module: z.literal("provider"), settings: providerSettingsSchema }),
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
