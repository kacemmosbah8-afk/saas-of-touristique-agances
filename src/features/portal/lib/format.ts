import type { SupplierOrderStatus } from "@prisma/client";

/** Shared display formatting for the portal's read-only views. */

export function formatMoney(amount: number, currency: string): string {
  return amount.toLocaleString(undefined, { style: "currency", currency });
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, { dateStyle: "long" });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Customer-safe translation of `SupplierOrderStatus` — deliberately NOT
 * `SUPPLIER_ORDER_STATUS_LABELS` from `supplier-execution/lib/status.ts`,
 * which is written for agency staff ("Execution failed", "Needs manual
 * reconciliation", "Not yet executed") and would be alarming or
 * meaningless to a traveler. Internal/transient/failure states return
 * `null` — the caller shows no badge at all rather than exposing
 * operational detail a customer has no way to act on; staff already see
 * the real status (and can act on it) in the agency-facing booking page.
 */
export function portalSupplierStatusLabel(status: SupplierOrderStatus): string | null {
  switch (status) {
    case "SUPPLIER_CONFIRMED":
      return "Confirmed";
    case "AWAITING_SUPPLIER_CONFIRMATION":
      return "Awaiting supplier confirmation";
    case "AWAITING_SUPPLIER_SETTLEMENT":
      return "Reserved";
    case "CANCELLED":
      return "Cancelled";
    case "PENDING":
    case "EXECUTING":
    case "SUPPLIER_FAILED":
    case "RECONCILIATION_REQUIRED":
      return null;
  }
}
