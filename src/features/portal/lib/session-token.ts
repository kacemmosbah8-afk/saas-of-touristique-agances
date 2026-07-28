import { randomBytes } from "node:crypto";

/**
 * High-entropy, URL-safe session token — the value stored in the portal's
 * httpOnly cookie. Same id/token split as `PortalMagicLink`/`Invitation`:
 * the cookie carries this bearer secret, never the row's own `id`, so a
 * leaked/logged row id can't be replayed as a credential.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

const SESSION_TTL_DAYS = 14;

/** Fixed TTL from creation — not a sliding window, so a stolen cookie can't
 * grant indefinite access just by staying in occasional use. */
export function sessionExpiryDate(from: Date = new Date()): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);
  return expires;
}

export function isSessionExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
