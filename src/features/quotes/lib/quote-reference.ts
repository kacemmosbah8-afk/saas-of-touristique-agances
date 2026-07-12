import { formatReference, parseReferenceSequence } from "@/shared/lib/reference";

/**
 * Quote reference formatting (`QT-<year>-<seq>`, e.g. `QT-2026-0001`).
 * Since M4 Sprint 3 the formatting itself lives in `shared/lib/reference.ts`
 * (one implementation for BK/QT/INV/PAY/CN) — this module keeps the
 * quote-specific prefix and the original export names so call sites and
 * tests are unchanged. The sequence number is allocated in the action layer
 * from a per-tenant count; the DB's `@@unique([tenantId, reference])` is the
 * final guard against a race.
 */

export const QUOTE_REFERENCE_PREFIX = "QT";

/** Format a quote reference from a calendar year and a 1-based sequence. */
export function formatQuoteReference(year: number, sequence: number): string {
  return formatReference(QUOTE_REFERENCE_PREFIX, year, sequence);
}

/** Parse the trailing sequence from a reference, or null if it doesn't match. */
export function parseQuoteReferenceSequence(reference: string): number | null {
  return parseReferenceSequence(QUOTE_REFERENCE_PREFIX, reference);
}
