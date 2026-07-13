import type { SupplierOrderStatus } from "@prisma/client";

import { canTransition } from "@/features/supplier-execution/lib/status";
import type { SupplierBookingStatus } from "@/features/supplier-execution/lib/types";

/**
 * Pure decision core of the Booking Status Resolution Capability — mirrors
 * `status.ts`'s canTransition/isTerminal split from `engine.ts`: the FSM
 * logic here is pure and unit-tested; `reconciliation.ts` executes the
 * resulting plan against the database and is exercised live, the same
 * discipline this codebase applies to every other DB-touching action/query.
 */

export type StatusCheckOutcome =
  | { ok: true; status: SupplierBookingStatus }
  | { ok: false; retryable: boolean; message: string };

export type ReconciliationPlan =
  | { action: "not_applicable" }
  | { action: "still_awaiting" }
  | { action: "confirm" }
  | { action: "cancel" }
  | { action: "check_failed"; retryable: boolean; message: string };

/**
 * Given a SupplierOrder's current status and a fresh check against the
 * supplier, decides what should happen next. No I/O, no randomness — same
 * inputs always produce the same plan, which is what makes "repeated
 * polling" and "idempotency" testable without a database.
 */
export function planReconciliation(
  currentStatus: SupplierOrderStatus,
  check: StatusCheckOutcome,
): ReconciliationPlan {
  // Idempotency: once an order has left AWAITING_SUPPLIER_CONFIRMATION —
  // resolved by a concurrent run, a manual "Check now", or an unrelated
  // cancellation — a later check (the job's own retry racing a manual
  // check, or a stale job that fires after resolution) must never re-apply
  // a transition. This also covers "immediate confirmation": an order that
  // resolved on its first execute() attempt never enters AWAITING in the
  // first place, so reconciliation is a guaranteed no-op for it.
  if (currentStatus !== "AWAITING_SUPPLIER_CONFIRMATION") {
    return { action: "not_applicable" };
  }

  if (!check.ok) {
    return { action: "check_failed", retryable: check.retryable, message: check.message };
  }

  if (check.status === "AWAITING_SUPPLIER_CONFIRMATION") {
    return { action: "still_awaiting" };
  }

  // Defensive: never force a transition the FSM itself wouldn't allow.
  if (!canTransition(currentStatus, check.status)) {
    return { action: "not_applicable" };
  }

  return check.status === "SUPPLIER_CONFIRMED" ? { action: "confirm" } : { action: "cancel" };
}
