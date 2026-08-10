import { formatReference, parseReferenceSequence } from "@/shared/lib/reference";

/**
 * Visa request reference formatting (`VR-<year>-<seq>`, e.g. `VR-2026-0001`).
 * Same shared `<PREFIX>-<year>-<seq>` module bookings/quotes/booking-requests
 * use.
 */

export const VISA_REQUEST_REFERENCE_PREFIX = "VR";

export function formatVisaRequestReference(year: number, sequence: number): string {
  return formatReference(VISA_REQUEST_REFERENCE_PREFIX, year, sequence);
}

export function parseVisaRequestReferenceSequence(reference: string): number | null {
  return parseReferenceSequence(VISA_REQUEST_REFERENCE_PREFIX, reference);
}
