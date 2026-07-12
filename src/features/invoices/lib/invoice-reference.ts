import { formatReference, parseReferenceSequence } from "@/shared/lib/reference";

/**
 * Invoice numbering (`INV-<year>-<seq>`, e.g. `INV-2026-0001`) and credit-note
 * numbering (`CN-<year>-<seq>`), both on the shared reference scheme
 * (shared/lib/reference.ts). The sequence is allocated per-tenant-per-year in
 * the action layer; each table's `@@unique([tenantId, reference])` is the
 * final race guard. Credit notes number independently of invoices — they are
 * separate financial documents.
 */

export const INVOICE_REFERENCE_PREFIX = "INV";
export const CREDIT_NOTE_REFERENCE_PREFIX = "CN";

/** Format an invoice reference from a calendar year and a 1-based sequence. */
export function formatInvoiceReference(year: number, sequence: number): string {
  return formatReference(INVOICE_REFERENCE_PREFIX, year, sequence);
}

/** Parse the trailing sequence from a reference, or null if it doesn't match. */
export function parseInvoiceReferenceSequence(reference: string): number | null {
  return parseReferenceSequence(INVOICE_REFERENCE_PREFIX, reference);
}

/** Format a credit-note reference from a calendar year and a 1-based sequence. */
export function formatCreditNoteReference(year: number, sequence: number): string {
  return formatReference(CREDIT_NOTE_REFERENCE_PREFIX, year, sequence);
}

/** Parse the trailing sequence from a reference, or null if it doesn't match. */
export function parseCreditNoteReferenceSequence(reference: string): number | null {
  return parseReferenceSequence(CREDIT_NOTE_REFERENCE_PREFIX, reference);
}
