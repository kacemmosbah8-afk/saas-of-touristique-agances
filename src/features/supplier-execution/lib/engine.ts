import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { classifyExecutionFailure } from "@/features/supplier-execution/lib/error-classification";
import { CLAIMABLE_STATUSES, CANCELLABLE_STATUSES } from "@/features/supplier-execution/lib/status";
import type {
  SupplierExecutionProvider,
  ExecutionRequest,
} from "@/features/supplier-execution/lib/types";

/**
 * The generic Supplier Execution engine. Everything here is provider-
 * agnostic — it depends only on `SupplierExecutionProvider`, never on a
 * concrete adapter. This is the reusable core; `providers/duffel/` is one
 * implementation of the interface it orchestrates.
 *
 * The three-step shape of `claimAndExecute` (claim → call → persist) and
 * why the persist step is the dangerous one is documented in PROJECT.md,
 * "Supplier Order Execution Capability" — compensation & failure recovery.
 */

async function writeEvent(
  db: TenantDb,
  tenantId: string,
  supplierOrderId: string,
  type:
    | "REQUESTED"
    | "ATTEMPT_STARTED"
    | "SUPPLIER_CONFIRMED"
    | "SUPPLIER_FAILED"
    | "RETRY_REQUESTED"
    | "CANCELLED"
    | "RECONCILIATION_FLAGGED",
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.supplierOrderEvent.create({
    data: { tenantId, supplierOrderId, type, message, metadata: metadata ?? undefined },
  });
}

async function persistFailure(
  db: TenantDb,
  tenantId: string,
  supplierOrderId: string,
  message: string,
  retryable: boolean,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.supplierOrder.update({
    where: { id: supplierOrderId, tenantId },
    data: { status: "SUPPLIER_FAILED", lastError: message, retryable },
  });
  await writeEvent(db, tenantId, supplierOrderId, "SUPPLIER_FAILED", message, metadata);
}

export type ExecuteOutcome =
  | { ok: true; status: "SUPPLIER_CONFIRMED" | "AWAITING_PAYMENT" | "AWAITING_SUPPLIER_CONFIRMATION" }
  | { ok: false; status: "conflict" | "SUPPLIER_FAILED" | "RECONCILIATION_REQUIRED"; error: string };

/**
 * Claims the right to execute (atomic — see PROJECT.md, "Idempotency"),
 * calls the provider, and persists the outcome. Safe to call for both a
 * fresh execution and a retry — both go through the same claim.
 */
export async function claimAndExecute(
  db: TenantDb,
  tenantId: string,
  supplierOrderId: string,
  provider: SupplierExecutionProvider,
  request: ExecutionRequest,
): Promise<ExecuteOutcome> {
  const claim = await db.supplierOrder.updateMany({
    where: { id: supplierOrderId, tenantId, status: { in: [...CLAIMABLE_STATUSES] } },
    data: { status: "EXECUTING", attempts: { increment: 1 }, lastAttemptAt: new Date() },
  });
  if (claim.count !== 1) {
    return {
      ok: false,
      status: "conflict",
      error: "This order is already executing or has already completed — refresh to see its current state.",
    };
  }

  await writeEvent(db, tenantId, supplierOrderId, "ATTEMPT_STARTED", "Execution attempt started.");
  logger.info("supplier execution: attempt started", { tenantId, supplierOrderId, provider: provider.provider });

  let result;
  try {
    result = await provider.execute(request);
  } catch (err) {
    const { retryable, message } = classifyExecutionFailure(err);
    logger.warn("supplier execution: provider call threw", { tenantId, supplierOrderId, error: String(err), retryable });
    await persistFailure(db, tenantId, supplierOrderId, message, retryable);
    return { ok: false, status: "SUPPLIER_FAILED", error: message };
  }

  if (!result.ok) {
    await persistFailure(db, tenantId, supplierOrderId, result.message, result.retryable, result.providerMetadata);
    return { ok: false, status: "SUPPLIER_FAILED", error: result.message };
  }

  // The compensation-sensitive step: the supplier call already succeeded —
  // real money may have moved (BALANCE mode) or a real hold now exists.
  // From here on, failure must never be treated as "nothing happened."
  try {
    const nextStatus = result.status;
    await db.supplierOrder.update({
      where: { id: supplierOrderId, tenantId },
      data: {
        status: nextStatus,
        supplierOrderId: result.supplierOrderId,
        confirmationNumber: result.confirmationNumber,
        confirmedAt: new Date(),
        lastError: null,
        retryable: null,
      },
    });
    await writeEvent(
      db,
      tenantId,
      supplierOrderId,
      "SUPPLIER_CONFIRMED",
      `Supplier order ${result.confirmationNumber} confirmed.`,
      result.providerMetadata,
    );
    logger.info("supplier execution: confirmed", { tenantId, supplierOrderId, supplierOrderRef: result.supplierOrderId });
    return { ok: true, status: nextStatus };
  } catch (persistErr) {
    // Logged BEFORE the recovery write below — if that write also fails,
    // this line is the only surviving trail that a real order may exist.
    logger.error("supplier execution: post-success persist failed — reconciliation required", {
      tenantId,
      supplierOrderId,
      supplierOrderRef: result.supplierOrderId,
      confirmationNumber: result.confirmationNumber,
      error: String(persistErr),
    });
    const reconciliationMessage =
      `Supplier confirmed order ${result.confirmationNumber} but TravelOS failed to record it. ` +
      `Check the supplier's own dashboard before doing anything else with this booking line.`;
    await db.supplierOrder
      .update({
        where: { id: supplierOrderId, tenantId },
        data: { status: "RECONCILIATION_REQUIRED", lastError: reconciliationMessage },
      })
      .catch(() => undefined);
    await writeEvent(
      db,
      tenantId,
      supplierOrderId,
      "RECONCILIATION_FLAGGED",
      reconciliationMessage,
      { supplierOrderRef: result.supplierOrderId, confirmationNumber: result.confirmationNumber },
    ).catch(() => undefined);
    return { ok: false, status: "RECONCILIATION_REQUIRED", error: reconciliationMessage };
  }
}

export type CancelOutcome = { ok: true } | { ok: false; error: string };

/**
 * Cancels a confirmed or held order. Lower concurrency risk than execution
 * (a duplicate cancel call is not the double-purchase hazard a duplicate
 * execute is), so this uses a simpler optimistic transition — claim by
 * moving straight to CANCELLED, and revert on provider failure — rather
 * than an intermediate "cancelling" state the schema doesn't model.
 */
export async function claimAndCancel(
  db: TenantDb,
  tenantId: string,
  supplierOrderId: string,
  provider: SupplierExecutionProvider,
): Promise<CancelOutcome> {
  const current = await db.supplierOrder.findFirst({
    where: { id: supplierOrderId, tenantId },
    select: { status: true, supplierOrderId: true },
  });
  if (!current) return { ok: false, error: "Supplier order not found." };
  if (!CANCELLABLE_STATUSES.includes(current.status)) {
    return { ok: false, error: "This order can't be cancelled from its current state." };
  }

  const claim = await db.supplierOrder.updateMany({
    where: { id: supplierOrderId, tenantId, status: current.status },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  if (claim.count !== 1) {
    return { ok: false, error: "This order's state changed — refresh and try again." };
  }

  const result = await provider.cancel({
    tenantId,
    supplierOrderId,
    supplierOrderRef: current.supplierOrderId,
  });

  if (!result.ok) {
    // Revert — the supplier call failed, so the order is still live.
    await db.supplierOrder.update({
      where: { id: supplierOrderId, tenantId },
      data: { status: current.status, cancelledAt: null, lastError: result.message },
    });
    logger.warn("supplier execution: cancellation failed", { tenantId, supplierOrderId, error: result.message });
    return { ok: false, error: result.message };
  }

  await writeEvent(db, tenantId, supplierOrderId, "CANCELLED", "Supplier order cancelled.", result.providerMetadata);
  logger.info("supplier execution: cancelled", { tenantId, supplierOrderId });
  return { ok: true };
}
