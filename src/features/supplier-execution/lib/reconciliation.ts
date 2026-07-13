import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { classifyExecutionFailure } from "@/features/supplier-execution/lib/error-classification";
import { planReconciliation, type ReconciliationPlan } from "@/features/supplier-execution/lib/reconciliation-plan";
import { enqueueJob } from "@/features/automation/lib/engine";
import { SEND_COMMUNICATION_JOB_TYPE } from "@/features/automation/handlers/send-communication.handler";
import type { SupplierExecutionProvider } from "@/features/supplier-execution/lib/types";

/**
 * The Booking Status Resolution Capability's DB-writing shell. Provider-
 * agnostic (depends only on `SupplierExecutionProvider`, never a concrete
 * adapter) and reusable by both the automatic path (the
 * `RECONCILE_SUPPLIER_ORDER` job handler, on the Platform Automation
 * Capability's existing schedule) and the manual path (a "Check now"
 * server action) — the exact same function, so the two can never drift.
 *
 * The decision logic itself lives in `reconciliation-plan.ts` (pure,
 * unit-tested); this function only executes whatever plan that produces.
 */

export type ReconcileOutcome =
  | { outcome: "confirmed" }
  | { outcome: "cancelled" }
  | { outcome: "still_awaiting" }
  | { outcome: "not_applicable" }
  | { outcome: "check_failed"; retryable: boolean; message: string };

type OrderRow = {
  id: string;
  status: "AWAITING_SUPPLIER_CONFIRMATION" | string;
  provider: "DUFFEL" | "HOTELBEDS";
  supplierOrderId: string | null;
  confirmationNumber: string | null;
  bookingId: string;
  bookingItemId: string;
  item: { description: string };
  booking: { customer: { email: string | null } };
};

async function writeSystemAudit(
  db: TenantDb,
  action: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  // No user actor — the transition is driven by what the supplier reported,
  // not by a staff decision. Same "system actor, null userId" shape
  // `writePortalAudit` already established for the Customer Portal's
  // non-staff actor (a traveler there, the automation worker here).
  await db.auditLog.create({
    data: { userId: null, action, entity: "supplier_order", entityId, metadata },
  });
}

async function applyConfirmed(db: TenantDb, tenantId: string, order: OrderRow): Promise<void> {
  await db.supplierOrder.update({
    where: { id: order.id, tenantId },
    data: { status: "SUPPLIER_CONFIRMED", confirmedAt: new Date(), lastError: null, retryable: null },
  });
  await db.supplierOrderEvent.create({
    data: {
      tenantId,
      supplierOrderId: order.id,
      type: "SUPPLIER_CONFIRMED",
      message: `Supplier order ${order.confirmationNumber ?? order.id} confirmed on reconciliation.`,
    },
  });
  await db.supplierConfirmation.upsert({
    where: { bookingItemId: order.bookingItemId },
    create: {
      tenantId,
      bookingId: order.bookingId,
      bookingItemId: order.bookingItemId,
      status: "CONFIRMED",
      supplierName: "Hotelbeds",
      confirmationNumber: order.confirmationNumber,
      respondedAt: new Date(),
    },
    update: {
      status: "CONFIRMED",
      confirmationNumber: order.confirmationNumber,
      respondedAt: new Date(),
    },
  });
  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId: order.bookingId,
      userId: null,
      type: "NOTE",
      title: `Supplier confirmed: ${order.item.description}`,
      description: `Confirmation #${order.confirmationNumber ?? "—"} (resolved via status reconciliation).`,
    },
  });
  await writeSystemAudit(db, "execute_reconcile_confirmed", order.id, {
    confirmationNumber: order.confirmationNumber,
  });

  if (order.booking.customer.email) {
    // Same idempotencyKey scheme `onExecutionOutcome` uses for an immediate
    // confirmation — a duplicate reconciliation run joins the same job row
    // rather than sending a second email.
    await enqueueJob({
      type: SEND_COMMUNICATION_JOB_TYPE,
      tenantId,
      idempotencyKey: `send_communication:supplier_order:${order.id}:confirmed`,
      payload: {
        tenantId,
        owner: { type: "supplier_order", id: order.id },
        to: order.booking.customer.email,
        subject: `Your hotel booking is confirmed — ${order.confirmationNumber ?? ""}`,
        html: `<p>Your hotel booking has been confirmed with the supplier. Confirmation number: <strong>${order.confirmationNumber ?? "—"}</strong>.</p>`,
        text: `Your hotel booking has been confirmed with the supplier. Confirmation number: ${order.confirmationNumber ?? "—"}.`,
      },
    }).catch((err) => {
      logger.warn("reconciliation: could not enqueue confirmation email job", {
        tenantId,
        supplierOrderId: order.id,
        error: String(err),
      });
    });
  }
}

async function applyCancelled(db: TenantDb, tenantId: string, order: OrderRow): Promise<void> {
  await db.supplierOrder.update({
    where: { id: order.id, tenantId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  await db.supplierOrderEvent.create({
    data: {
      tenantId,
      supplierOrderId: order.id,
      type: "CANCELLED",
      message: "Supplier declined the on-request booking (resolved via status reconciliation).",
    },
  });
  await db.supplierConfirmation.upsert({
    where: { bookingItemId: order.bookingItemId },
    create: {
      tenantId,
      bookingId: order.bookingId,
      bookingItemId: order.bookingItemId,
      status: "REJECTED",
      supplierName: "Hotelbeds",
      respondedAt: new Date(),
    },
    update: { status: "REJECTED", respondedAt: new Date() },
  });
  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId: order.bookingId,
      userId: null,
      type: "NOTE",
      title: `Supplier declined: ${order.item.description}`,
      description: "The supplier did not confirm this on-request booking.",
    },
  });
  await writeSystemAudit(db, "execute_reconcile_cancelled", order.id);
}

export async function reconcileSupplierOrder(
  db: TenantDb,
  tenantId: string,
  supplierOrderId: string,
  provider: SupplierExecutionProvider,
): Promise<ReconcileOutcome> {
  const order = await db.supplierOrder.findFirst({
    where: { id: supplierOrderId, tenantId },
    select: {
      id: true,
      status: true,
      provider: true,
      supplierOrderId: true,
      confirmationNumber: true,
      bookingId: true,
      bookingItemId: true,
      item: { select: { description: true } },
      booking: { select: { customer: { select: { email: true } } } },
    },
  });
  if (!order) return { outcome: "not_applicable" };
  if (order.provider !== provider.provider) {
    return {
      outcome: "check_failed",
      retryable: false,
      message: `Mismatched provider adapter (order is ${order.provider}, checked with ${provider.provider}).`,
    };
  }

  let plan: ReconciliationPlan;
  if (order.status !== "AWAITING_SUPPLIER_CONFIRMATION") {
    plan = planReconciliation(order.status, { ok: true, status: "AWAITING_SUPPLIER_CONFIRMATION" });
  } else if (!provider.checkStatus) {
    plan = { action: "check_failed", retryable: false, message: `${provider.provider} does not support status reconciliation.` };
  } else {
    try {
      const result = await provider.checkStatus({
        tenantId,
        supplierOrderId: order.id,
        supplierOrderRef: order.supplierOrderId,
      });
      await db.supplierOrderEvent.create({
        data: {
          tenantId,
          supplierOrderId: order.id,
          type: "STATUS_CHECKED",
          message: `Supplier reports: ${result.status}.`,
          metadata: result.providerMetadata,
        },
      });
      plan = planReconciliation(order.status, { ok: true, status: result.status });
    } catch (err) {
      const { retryable, message } = classifyExecutionFailure(err);
      await db.supplierOrderEvent.create({
        data: {
          tenantId,
          supplierOrderId: order.id,
          type: "STATUS_CHECKED",
          message: `Status check failed: ${message}`,
          metadata: { retryable },
        },
      });
      logger.warn("reconciliation: status check failed", { tenantId, supplierOrderId, error: String(err), retryable });
      plan = planReconciliation(order.status, { ok: false, retryable, message });
    }
  }

  switch (plan.action) {
    case "not_applicable":
      return { outcome: "not_applicable" };
    case "still_awaiting":
      return { outcome: "still_awaiting" };
    case "check_failed":
      return { outcome: "check_failed", retryable: plan.retryable, message: plan.message };
    case "confirm":
      await applyConfirmed(db, tenantId, order);
      logger.info("reconciliation: order confirmed", { tenantId, supplierOrderId });
      return { outcome: "confirmed" };
    case "cancel":
      await applyCancelled(db, tenantId, order);
      logger.info("reconciliation: order cancelled by supplier", { tenantId, supplierOrderId });
      return { outcome: "cancelled" };
  }
}
