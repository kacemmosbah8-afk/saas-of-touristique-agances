import type { BookingStatus } from "@prisma/client";

/**
 * Booking lifecycle transition rules. Pure and side-effect free so they can be
 * unit-tested and reused by both the server action and the UI (to enable/grey
 * out status buttons). The database does not enforce these — this module is the
 * single source of truth for "what can follow what".
 *
 *   DRAFT ──▶ CONFIRMED ──▶ IN_PROGRESS ──▶ COMPLETED
 *     │           │              │
 *     └───────────┴──────────────┴────────▶ CANCELLED
 *
 * CANCELLED and COMPLETED are terminal. A CONFIRMED booking may drop back to
 * DRAFT (e.g. to re-quote) before fulfilment begins.
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "DRAFT", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const BOOKING_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Statuses that count as an active, revenue-bearing booking. */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
];

/** Can a booking move from `from` to `to`? A no-op (from === to) is allowed. */
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** The set of statuses a booking in `from` may move to (excluding itself). */
export function nextStatuses(from: BookingStatus): readonly BookingStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function isTerminal(status: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
