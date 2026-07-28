import { randomBytes } from "node:crypto";

/**
 * High-entropy, URL-safe magic-link token — same shape as
 * `features/tenants/lib/invitation-token.ts` (id/token split: the row's
 * `id` identifies it, `token` is the bearer secret). Deliberately short-
 * lived: this token only has to survive the gap between "check email" and
 * "click the link," never a whole session.
 */
export function generateMagicLinkToken(): string {
  return randomBytes(32).toString("base64url");
}

const MAGIC_LINK_TTL_MINUTES = 15;

export function magicLinkExpiryDate(from: Date = new Date()): Date {
  const expires = new Date(from);
  expires.setMinutes(expires.getMinutes() + MAGIC_LINK_TTL_MINUTES);
  return expires;
}

export function isMagicLinkExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
