import { randomBytes } from "node:crypto";

/**
 * High-entropy, URL-safe invitation token. Deliberately not a `cuid()` —
 * `Invitation.id` identifies the row, `token` is the bearer secret that
 * grants access to it, and the two must not be the same value (a guessable
 * or enumerable id must never double as an auth credential).
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

const INVITATION_TTL_DAYS = 7;

export function invitationExpiryDate(from: Date = new Date()): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + INVITATION_TTL_DAYS);
  return expires;
}

export function isInvitationExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
