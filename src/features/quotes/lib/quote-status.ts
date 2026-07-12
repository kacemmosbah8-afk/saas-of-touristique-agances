import type { QuoteStatus } from "@prisma/client";

/**
 * Quote lifecycle transition rules. Pure and side-effect free so they can be
 * unit-tested and reused by both the server action and the UI (to enable/grey
 * out status buttons). The database does not enforce these — this module is the
 * single source of truth for "what can follow what".
 *
 *   DRAFT ──▶ SENT ──▶ ACCEPTED ──▶ (CONVERTED, via conversion action)
 *     │         │  │
 *     │         │  └──▶ DECLINED
 *     │         └─────▶ EXPIRED
 *     └───────────────▶ (edit freely while DRAFT)
 *
 * A SENT quote can be pulled back to DRAFT to revise and re-send. ACCEPTED is
 * the gate for conversion into a Booking. DECLINED, EXPIRED and CONVERTED are
 * terminal. CONVERTED is never set through the generic status action — it is
 * set only by the conversion action (see convertQuoteAction), so it is not a
 * reachable manual target here.
 */
const ALLOWED_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "DECLINED", "EXPIRED", "DRAFT"],
  ACCEPTED: ["DECLINED", "DRAFT"],
  DECLINED: [],
  EXPIRED: ["DRAFT"],
  CONVERTED: [],
};

export const QUOTE_STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "CONVERTED",
] as const;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  CONVERTED: "Converted",
};

/** Statuses that represent an open, still-actionable quote. */
export const OPEN_QUOTE_STATUSES: readonly QuoteStatus[] = ["DRAFT", "SENT"];

/** Line items may only be edited while the quote is not yet terminal/decided. */
export function canEditItems(status: QuoteStatus): boolean {
  return status === "DRAFT" || status === "SENT";
}

/** Can a quote move from `from` to `to`? A no-op (from === to) is allowed. */
export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** The set of statuses a quote in `from` may move to (excluding itself). */
export function nextStatuses(from: QuoteStatus): readonly QuoteStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function isTerminal(status: QuoteStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/** Only an ACCEPTED quote that hasn't already been converted may convert. */
export function canConvert(status: QuoteStatus): boolean {
  return status === "ACCEPTED";
}
