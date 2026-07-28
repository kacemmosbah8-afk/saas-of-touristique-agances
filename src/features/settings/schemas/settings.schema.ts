import { z } from "zod";

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
 * render as an empty state on the public site, never a placeholder. Logo
 * and brand color are NOT here — this is a single-customer, custom-built
 * site, so those are fixed in code (`shared/components/brand/logo.tsx`,
 * `globals.css`), not admin-editable settings.
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

// Single-variant now that Workspace/CRM/Lead/Supplier settings are gone —
// kept as its own schema (rather than folding into profileSettingsSchema
// directly) so `updateModuleSettingsAction` keeps one settings-writing entry
// point shaped the same way regardless of how many modules exist.
export const moduleSettingsSchema = z.object({
  module: z.literal("profile"),
  settings: profileSettingsSchema,
});
export type ModuleSettingsInput = z.infer<typeof moduleSettingsSchema>;
