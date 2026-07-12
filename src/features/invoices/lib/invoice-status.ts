import type { InvoiceStatus } from "@prisma/client";

/**
 * Invoice lifecycle transition rules. Pure and side-effect free so they can be
 * unit-tested and reused by both the server actions and the UI. The database
 * does not enforce these — this module is the single source of truth.
 *
 *   DRAFT ──▶ ISSUED ──▶ PARTIALLY_PAID ──▶ PAID
 *     │          │  ▲          │  ▲            │
 *     │          │  └──────────┘  └────────────┘   (payments/refunds move
 *     │          │                                  between these — SYSTEM
 *     │          └──▶ VOID ◀── PARTIALLY_PAID*      transitions, never manual)
 *     └ (delete while DRAFT — a draft is not yet a financial record)
 *
 * ISSUED locks the line items (edits are DRAFT-only). PARTIALLY_PAID and PAID
 * are set exclusively by the balance recompute after a payment/refund/credit
 * change; the generic status action never targets them. VOID requires a
 * reason and is only reachable while nothing is net-paid — money on the
 * record must be refunded first (*so a PARTIALLY_PAID invoice can only be
 * voided after its payments are fully refunded, which drops it back to
 * ISSUED). VOID and PAID-with-balance-settled are terminal for editing;
 * a refund can reopen PAID back to PARTIALLY_PAID/ISSUED.
 */
const ALLOWED_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ["ISSUED"],
  ISSUED: ["PARTIALLY_PAID", "PAID", "VOID"],
  PARTIALLY_PAID: ["PAID", "ISSUED"],
  PAID: ["PARTIALLY_PAID", "ISSUED"],
  VOID: [],
};

/**
 * Statuses the balance recompute may set. These are never valid manual
 * targets — the UI/action layer must not offer them.
 */
export const SYSTEM_INVOICE_STATUSES: readonly InvoiceStatus[] = [
  "PARTIALLY_PAID",
  "PAID",
];

export const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "VOID",
] as const;

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  VOID: "Void",
};

/** Statuses that represent an open, collectable invoice. */
export const OPEN_INVOICE_STATUSES: readonly InvoiceStatus[] = [
  "ISSUED",
  "PARTIALLY_PAID",
];

/** Can a document move from `from` to `to`? A no-op (from === to) is allowed. */
export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: InvoiceStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/** Line items may only be edited while the invoice is a draft. */
export function canEditItems(status: InvoiceStatus): boolean {
  return status === "DRAFT";
}

/** Only a draft may be issued. */
export function canIssue(status: InvoiceStatus): boolean {
  return status === "DRAFT";
}

/**
 * An invoice can be voided while collectable — but only when nothing is
 * net-paid on it (checked by the action with the live balance): refund first,
 * then void.
 */
export function canVoid(status: InvoiceStatus): boolean {
  return status === "ISSUED" || status === "PARTIALLY_PAID";
}

/** Payments may only be recorded against an open (collectable) invoice. */
export function canRecordPayment(status: InvoiceStatus): boolean {
  return status === "ISSUED" || status === "PARTIALLY_PAID";
}

/** Credit notes may be issued while the invoice is open or already paid
 * (a post-payment credit prepares a refund). Never on drafts or voids. */
export function canIssueCreditNote(status: InvoiceStatus): boolean {
  return status === "ISSUED" || status === "PARTIALLY_PAID" || status === "PAID";
}

/**
 * Given the amount owed and the net paid (both ≥ 0, from computeBalance),
 * derive the collection status an open invoice should carry. Pure — the
 * balance recompute persists the result. Returns null when the invoice is
 * not in a collection state (DRAFT/VOID are never touched by recompute).
 */
export function deriveCollectionStatus(
  current: InvoiceStatus,
  amountOwed: number,
  netPaid: number,
): InvoiceStatus | null {
  if (current === "DRAFT" || current === "VOID") return null;
  if (amountOwed > 0 && netPaid >= amountOwed) return "PAID";
  if (netPaid > 0) return "PARTIALLY_PAID";
  return "ISSUED";
}

/**
 * Overdue is derived, never stored: an open invoice past its due date with
 * a balance still to collect. `now` is injectable for tests.
 */
export function isOverdue(
  status: InvoiceStatus,
  dueDate: Date | null,
  balanceDue: number,
  now: Date = new Date(),
): boolean {
  if (!OPEN_INVOICE_STATUSES.includes(status)) return false;
  if (!dueDate || balanceDue <= 0) return false;
  return dueDate.getTime() < now.getTime();
}
