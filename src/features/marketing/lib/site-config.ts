import "server-only";

import { env } from "@/shared/config/env";

/**
 * The single source of truth for every public-facing identity fact — the
 * agency's own name, support email, address, social links, canonical site
 * URL. Read once here from `env` so metadata, the footer, and every legal
 * page template pull the same value instead of five independent copies.
 * This deployment is licensed and sold once to a single named agency (One
 * One Tourism, Algeria) — there is no separate software-vendor identity to
 * maintain alongside it, so every field here IS the agency's own identity,
 * not a platform operator's. Fields the agency hasn't supplied real values
 * for yet fall back to an obviously-a-placeholder string so the site still
 * renders correctly rather than showing blank/undefined text.
 */

const siteUrl = (env.SITE_URL ?? env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const siteConfig = {
  name: "One One Tourism",
  tagline: "Algeria's Travel & Tourism Agency",
  description:
    "One One Tourism is a travel and tourism agency in Algeria offering curated packages, flights, and hotel bookings across popular destinations.",
  url: siteUrl,
  supportEmail: env.SUPPORT_EMAIL ?? "contact@oneonetourism-travel.dz",
  // Trading name until the registered legal entity name is supplied — set
  // COMPANY_LEGAL_NAME to the real one before this is legally binding.
  companyLegalName: env.COMPANY_LEGAL_NAME ?? "One One Tourism",
  companyAddress: env.COMPANY_ADDRESS ?? "Address not yet configured (set COMPANY_ADDRESS)",
  social: {
    twitter: env.SOCIAL_TWITTER_URL ?? null,
    linkedin: env.SOCIAL_LINKEDIN_URL ?? null,
  },
} as const;

export type SiteConfig = typeof siteConfig;
