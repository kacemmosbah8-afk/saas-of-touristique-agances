/**
 * Booking money math. The pure integer-cents arithmetic now lives in the
 * shared money module (`@/shared/lib/money`) so bookings and quotes (and any
 * future priced document) share one source of truth instead of duplicating the
 * formula. This file re-exports it under the booking-domain names the existing
 * call sites and tests already use.
 */

export {
  lineAmount,
  computeTotals,
  type LineInput,
  type MoneyTotals as BookingTotals,
  type MoneyTotalsInput as BookingTotalsInput,
} from "@/shared/lib/money";
