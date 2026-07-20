import { formatReference, parseReferenceSequence } from "@/shared/lib/reference";

/**
 * Booking request reference formatting (`BR-<year>-<seq>`, e.g. `BR-2026-0001`).
 * Same shared `<PREFIX>-<year>-<seq>` module bookings/quotes/invoices use.
 */

export const BOOKING_REQUEST_REFERENCE_PREFIX = "BR";

export function formatBookingRequestReference(year: number, sequence: number): string {
  return formatReference(BOOKING_REQUEST_REFERENCE_PREFIX, year, sequence);
}

export function parseBookingRequestReferenceSequence(reference: string): number | null {
  return parseReferenceSequence(BOOKING_REQUEST_REFERENCE_PREFIX, reference);
}
