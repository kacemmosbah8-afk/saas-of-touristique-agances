import { createHash } from "node:crypto";

/**
 * Hotelbeds X-Signature: SHA-256 hex of apiKey + secret + unix seconds.
 * Isolated in its own module so it can be unit-tested without touching env.
 */
export function hotelbedsSignature(
  apiKey: string,
  secret: string,
  unixSeconds: number,
): string {
  return createHash("sha256")
    .update(`${apiKey}${secret}${unixSeconds}`)
    .digest("hex");
}
