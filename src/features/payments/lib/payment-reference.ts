import { formatReference, parseReferenceSequence } from "@/shared/lib/reference";

/**
 * Payment reference formatting (`PAY-<year>-<seq>`, e.g. `PAY-2026-0001`) on
 * the shared reference scheme (shared/lib/reference.ts). The sequence is
 * allocated per-tenant-per-year in the action layer; the DB's
 * `@@unique([tenantId, reference])` is the final race guard.
 */

export const PAYMENT_REFERENCE_PREFIX = "PAY";

/** Format a payment reference from a calendar year and a 1-based sequence. */
export function formatPaymentReference(year: number, sequence: number): string {
  return formatReference(PAYMENT_REFERENCE_PREFIX, year, sequence);
}

/** Parse the trailing sequence from a reference, or null if it doesn't match. */
export function parsePaymentReferenceSequence(reference: string): number | null {
  return parseReferenceSequence(PAYMENT_REFERENCE_PREFIX, reference);
}
