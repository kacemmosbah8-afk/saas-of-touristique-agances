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
