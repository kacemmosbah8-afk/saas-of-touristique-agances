import type { BookingRequestStatus } from "@prisma/client";

/**
 * Booking request lifecycle transition rules. Pure and side-effect free, the
 * single source of truth for "what can follow what" — mirrors
 * `bookings/lib/status.ts`. The DB does not enforce this.
 *
 *   PENDING ──▶ CONTACTED ──▶ CONFIRMED
 *      │             │
 *      └─────────────┴────────▶ REJECTED / CANCELLED
 *
 * CONFIRMED is a **system** state: it is only ever set by
 * `convertBookingRequestAction` (mirrors Quote's CONVERTED / Invoice's
 * PAID — a derived outcome, never a manual dropdown target). REJECTED and
 * CANCELLED are terminal.
 */
const ALLOWED_TRANSITIONS: Record<BookingRequestStatus, readonly BookingRequestStatus[]> = {
  PENDING: ["CONTACTED", "CONFIRMED", "REJECTED", "CANCELLED"],
  CONTACTED: ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const BOOKING_REQUEST_STATUSES = [
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
] as const;

export const BOOKING_REQUEST_STATUS_LABELS: Record<BookingRequestStatus, string> = {
  PENDING: "Pending",
  CONTACTED: "Contacted",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** Manually-settable statuses (excludes the system-only CONFIRMED state). */
export const MANUAL_BOOKING_REQUEST_STATUSES: readonly BookingRequestStatus[] = [
  "PENDING",
  "CONTACTED",
  "REJECTED",
  "CANCELLED",
];

export function canTransition(from: BookingRequestStatus, to: BookingRequestStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: BookingRequestStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/** May this request still be converted into a booking? */
export function canConvert(status: BookingRequestStatus): boolean {
  return status === "PENDING" || status === "CONTACTED";
}
