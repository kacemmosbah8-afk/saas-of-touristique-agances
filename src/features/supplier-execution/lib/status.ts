import type { SupplierOrderStatus } from "@prisma/client";

/**
 * SupplierOrder lifecycle transition rules. Pure and side-effect free, the
 * same discipline as `features/bookings/lib/status.ts` — the single source
 * of truth for "what can follow what," reused by the engine and the UI.
 *
 *   PENDING ──▶ EXECUTING ──▶ SUPPLIER_CONFIRMED ──▶ AWAITING_PAYMENT ──▶ SUPPLIER_CONFIRMED
 *                  │                                  (HOLD only)         (pay-order step,
 *                  │                                                       not built this sprint)
 *                  ├──▶ AWAITING_SUPPLIER_CONFIRMATION ──▶ SUPPLIER_CONFIRMED / SUPPLIER_FAILED
 *                  │      (Hotelbeds "ON REQUEST" — no auto-resolution, see the enum's own doc)
 *                  ├──▶ SUPPLIER_FAILED ──▶ EXECUTING    (retry, if retryable)
 *                  └──▶ RECONCILIATION_REQUIRED  (terminal — human resolves manually)
 *
 *   SUPPLIER_CONFIRMED / AWAITING_PAYMENT / AWAITING_SUPPLIER_CONFIRMATION ──▶ CANCELLED
 *
 * See PROJECT.md, "Supplier Order Execution Capability" for why each edge
 * exists — most notably why RECONCILIATION_REQUIRED has no automated way
 * out (retrying a possibly-already-successful purchase risks a second real
 * order).
 */
const ALLOWED_TRANSITIONS: Record<SupplierOrderStatus, readonly SupplierOrderStatus[]> = {
  PENDING: ["EXECUTING"],
  EXECUTING: [
    "SUPPLIER_CONFIRMED",
    "AWAITING_SUPPLIER_CONFIRMATION",
    "SUPPLIER_FAILED",
    "RECONCILIATION_REQUIRED",
  ],
  SUPPLIER_CONFIRMED: ["AWAITING_PAYMENT", "CANCELLED"],
  SUPPLIER_FAILED: ["EXECUTING"],
  AWAITING_PAYMENT: ["SUPPLIER_CONFIRMED", "CANCELLED"],
  AWAITING_SUPPLIER_CONFIRMATION: ["SUPPLIER_CONFIRMED", "SUPPLIER_FAILED", "CANCELLED"],
  CANCELLED: [],
  RECONCILIATION_REQUIRED: ["SUPPLIER_CONFIRMED", "CANCELLED"],
};

export function canTransition(from: SupplierOrderStatus, to: SupplierOrderStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: SupplierOrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/** Statuses from which a claim-to-execute may be attempted (fresh or retry). */
export const CLAIMABLE_STATUSES: readonly SupplierOrderStatus[] = ["PENDING", "SUPPLIER_FAILED"];

/** Statuses from which cancellation is offered. */
export const CANCELLABLE_STATUSES: readonly SupplierOrderStatus[] = [
  "SUPPLIER_CONFIRMED",
  "AWAITING_PAYMENT",
  "AWAITING_SUPPLIER_CONFIRMATION",
];

export const SUPPLIER_ORDER_STATUS_LABELS: Record<SupplierOrderStatus, string> = {
  PENDING: "Not yet executed",
  EXECUTING: "Executing…",
  SUPPLIER_CONFIRMED: "Supplier confirmed",
  SUPPLIER_FAILED: "Execution failed",
  AWAITING_PAYMENT: "Held — awaiting payment",
  AWAITING_SUPPLIER_CONFIRMATION: "Awaiting supplier confirmation",
  CANCELLED: "Cancelled",
  RECONCILIATION_REQUIRED: "Needs manual reconciliation",
};
