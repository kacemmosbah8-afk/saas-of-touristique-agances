import "server-only";

import { env } from "@/shared/config/env";

/**
 * The single source of truth for every public-facing identity fact —
 * company name, support email, address, social links, canonical site URL.
 * Read once here from `env` so metadata, the footer, and every legal page
 * template pull the same value instead of five independent copies. Every
 * field falls back to an obviously-a-placeholder value so the site renders
 * correctly before real values are configured — see PROJECT.md, "Public
 * Website & Verification Readiness" for which of these must be replaced
 * with real company information before submitting to a payment provider
 * for verification.
 */

const siteUrl = (env.SITE_URL ?? env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const siteConfig = {
  name: "TravelOS",
  tagline: "The Operating System for Travel Agencies",
  description:
    "TravelOS is the operating system travel agencies run their business on — bookings, quotes, invoicing, supplier integrations, and team collaboration in one platform.",
  url: siteUrl,
  supportEmail: env.SUPPORT_EMAIL ?? "support@travelos.app",
  companyLegalName: env.COMPANY_LEGAL_NAME ?? "TravelOS, Inc. (placeholder — set COMPANY_LEGAL_NAME)",
  companyAddress: env.COMPANY_ADDRESS ?? "Company address not yet configured (set COMPANY_ADDRESS)",
  social: {
    twitter: env.SOCIAL_TWITTER_URL ?? null,
    linkedin: env.SOCIAL_LINKEDIN_URL ?? null,
  },
} as const;

export type SiteConfig = typeof siteConfig;
