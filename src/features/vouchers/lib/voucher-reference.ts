import { formatReference, parseReferenceSequence } from "@/shared/lib/reference";

/**
 * Voucher reference formatting (`VCH-<year>-<seq>`, e.g. `VCH-2026-0001`) on
 * the shared reference scheme (shared/lib/reference.ts). The sequence is
 * allocated per-tenant-per-year in the action layer; the DB's
 * `@@unique([tenantId, reference])` is the final race guard.
 */

export const VOUCHER_REFERENCE_PREFIX = "VCH";

/** Format a voucher reference from a calendar year and a 1-based sequence. */
export function formatVoucherReference(year: number, sequence: number): string {
  return formatReference(VOUCHER_REFERENCE_PREFIX, year, sequence);
}

/** Parse the trailing sequence from a reference, or null if it doesn't match. */
export function parseVoucherReferenceSequence(reference: string): number | null {
  return parseReferenceSequence(VOUCHER_REFERENCE_PREFIX, reference);
}

/**
 * The payload a QR renderer will encode on the printed voucher: enough for a
 * supplier to verify the voucher against the agency without a lookup table.
 * Kept as a stable, versioned, pipe-delimited string (not JSON) so it stays
 * short enough for a small QR code.
 */
export function buildVoucherQrData(args: {
  voucherReference: string;
  bookingReference: string;
  confirmationNumber?: string | null;
}): string {
  const parts = ["TRAVELOS", "V1", args.voucherReference, args.bookingReference];
  if (args.confirmationNumber) parts.push(args.confirmationNumber);
  return parts.join("|");
}
