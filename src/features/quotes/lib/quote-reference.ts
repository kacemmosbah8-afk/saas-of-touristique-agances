/**
 * Quote reference formatting. The reference is human-facing and per-tenant
 * unique (`QT-<year>-<seq>`, e.g. `QT-2026-0001`). The formatting is pure and
 * tested here; the sequence number is allocated in the action layer from a
 * per-tenant count inside the same request that creates the quote, and the DB's
 * `@@unique([tenantId, reference])` is the final guard against a race. Mirrors
 * the booking reference scheme (`BK-…`) with a distinct prefix.
 */

export const QUOTE_REFERENCE_PREFIX = "QT";

/** Format a quote reference from a calendar year and a 1-based sequence. */
export function formatQuoteReference(year: number, sequence: number): string {
  const seq = String(Math.max(1, Math.trunc(sequence))).padStart(4, "0");
  return `${QUOTE_REFERENCE_PREFIX}-${year}-${seq}`;
}

/** Parse the trailing sequence from a reference, or null if it doesn't match. */
export function parseQuoteReferenceSequence(reference: string): number | null {
  const match = new RegExp(`^${QUOTE_REFERENCE_PREFIX}-(\\d{4})-(\\d+)$`).exec(reference);
  if (!match) return null;
  return Number.parseInt(match[2], 10);
}
