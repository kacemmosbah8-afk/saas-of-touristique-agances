/**
 * Booking reference formatting. The reference is human-facing and per-tenant
 * unique (`BK-<year>-<seq>`, e.g. `BK-2026-0001`). The formatting is pure and
 * tested here; the sequence number is allocated in the action layer from a
 * per-tenant count inside the same transaction that creates the booking, and
 * the DB's `@@unique([tenantId, reference])` is the final guard against a race.
 */

export const BOOKING_REFERENCE_PREFIX = "BK";

/** Format a booking reference from a calendar year and a 1-based sequence. */
export function formatBookingReference(year: number, sequence: number): string {
  const seq = String(Math.max(1, Math.trunc(sequence))).padStart(4, "0");
  return `${BOOKING_REFERENCE_PREFIX}-${year}-${seq}`;
}

/** Parse the trailing sequence from a reference, or null if it doesn't match. */
export function parseBookingReferenceSequence(reference: string): number | null {
  const match = new RegExp(`^${BOOKING_REFERENCE_PREFIX}-(\\d{4})-(\\d+)$`).exec(reference);
  if (!match) return null;
  return Number.parseInt(match[2], 10);
}
