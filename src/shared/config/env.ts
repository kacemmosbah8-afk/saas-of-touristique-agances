import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.url(),
  DIRECT_URL: z.url().optional(),

  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.url().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  UPLOADTHING_TOKEN: z.string().optional(),

  /**
   * 32-byte key (hex or base64) for AES-256-GCM encryption of provider
   * credentials. Optional: when unset, the key is derived from AUTH_SECRET via
   * scrypt so local/dev works out of the box. Set an explicit key in
   * production so rotating AUTH_SECRET does not orphan stored credentials.
   */
  ENCRYPTION_KEY: z.string().optional(),

  // --- External integrations (M3). All optional: a provider whose
  // credentials are missing simply reports itself as not configured.
  DUFFEL_TOKEN: z.string().optional(),
  HOTELBEDS_HOTEL_API_KEY: z.string().optional(),
  HOTELBEDS_HOTEL_SECRET: z.string().optional(),
  HOTELBEDS_ENVIRONMENT: z.enum(["test", "live"]).default("test"),
  AMADEUS_CLIENT_ID: z.string().optional(),
  AMADEUS_CLIENT_SECRET: z.string().optional(),
  /** TravelPayouts Content Synchronization Engine — the platform-wide
   * fallback token, mirroring every other integration above. */
  TRAVELPAYOUTS_TOKEN: z.string().optional(),
  /** Optional Redis URL for the cache layer; DB cache is used when unset. */
  REDIS_URL: z.string().optional(),

  // --- Outbound email (Sprint X, Milestone 1). Both optional: with either
  // unset, sendEmail() reports "not_configured" and logs a warning instead
  // of throwing — the same graceful-absence pattern as the supplier
  // integrations above.
  RESEND_API_KEY: z.string().optional(),
  /** "Display Name <address@domain>" or a bare address — passed to Resend as-is. */
  EMAIL_FROM: z.string().optional(),

  /**
   * Platform Automation Capability worker trigger. Optional, but the
   * `/api/jobs/process` route fails closed (503) rather than accepting
   * unauthenticated triggers when unset — never a silently-open endpoint.
   * Named CRON_SECRET (not a bespoke name) to match Vercel's own
   * documented convention: when set, Vercel Cron sends it as
   * `Authorization: Bearer $CRON_SECRET` automatically.
   */
  CRON_SECRET: z.string().optional(),

  // --- Public website & verification readiness. All optional — every
  // consumer falls back to a clearly-labelled placeholder (see
  // features/marketing/lib/site-config.ts) so the site renders correctly
  // before these are set, and a payment-provider verification pass will
  // surface exactly which ones still need a real value.
  /** Canonical public site URL (metadata, canonical links, sitemap, robots). Falls back to AUTH_URL, then localhost. */
  SITE_URL: z.url().optional(),
  SUPPORT_EMAIL: z.string().email().optional(),
  /** Full registered legal entity name — appears on legal pages and the footer. */
  COMPANY_LEGAL_NAME: z.string().optional(),
  /** Registered business address — expected by most payment-provider verification checks. */
  COMPANY_ADDRESS: z.string().optional(),
  SOCIAL_TWITTER_URL: z.url().optional(),
  SOCIAL_LINKEDIN_URL: z.url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    z.treeifyError(parsed.error),
  );
  throw new Error("Invalid environment variables — see log above.");
}

/**
 * Validated, typed process.env. Import this instead of reading
 * `process.env` directly anywhere in server-only code.
 */
export const env = parsed.data;
