/**
 * Shared document-reference formatting (`<PREFIX>-<year>-<seq>`, e.g.
 * "BK-2026-0001"). Extracted in M4 Sprint 3 — the same move as the shared
 * money module — so bookings (BK), quotes (QT), invoices (INV), payments
 * (PAY) and credit notes (CN) share one implementation instead of five
 * copies. References are human-facing and per-tenant unique; the sequence
 * number is allocated in the action layer from a per-tenant count, and each
 * table's `@@unique([tenantId, reference])` is the final guard against a
 * race.
 */

/** Format a reference from a prefix, calendar year and 1-based sequence. */
export function formatReference(prefix: string, year: number, sequence: number): string {
  const seq = String(Math.max(1, Math.trunc(sequence))).padStart(4, "0");
  return `${prefix}-${year}-${seq}`;
}

/** Parse the trailing sequence from a reference, or null if it doesn't match. */
export function parseReferenceSequence(prefix: string, reference: string): number | null {
  const match = new RegExp(`^${prefix}-(\\d{4})-(\\d+)$`).exec(reference);
  if (!match) return null;
  return Number.parseInt(match[2], 10);
}
