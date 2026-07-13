"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import type { ActionResult } from "@/shared/types/action-result";
import { createManualBillingProvider } from "@/features/billing/providers/manual/manual-billing-provider";
import { canTransition, effectiveStatus, periodEndFor, tenantPlanFor } from "@/features/billing/lib/status";
import { checkSeatLimit } from "@/features/billing/lib/entitlements";
import {
  activatePlanSchema,
  changePlanSchema,
  type ActivatePlanInput,
  type ChangePlanInput,
} from "@/features/billing/schemas/billing.schema";

const billingProvider = createManualBillingProvider();

/**
 * Sets a subscription onto `status` + `plan`, keeping the `Tenant.plan`/
 * `Tenant.status` fast projection in sync in the same call — the one place
 * that projection is ever written, so it can never drift from the detailed
 * `Subscription` record (see `status.ts`'s doc comment on `tenantStatusFor`).
 */
async function applyPlanAndStatus(
  db: Awaited<ReturnType<typeof requirePermission>>["db"],
  tenantId: string,
  planId: string,
  planCode: string,
  status: "ACTIVE" | "CANCELLED",
  extra: { trialEndsAt?: null; gracePeriodEndsAt?: null; currentPeriodEnd?: Date | null; cancelledAt?: Date },
): Promise<void> {
  await db.subscription.update({
    where: { tenantId },
    data: { planId, status, ...extra },
  });
  await db.tenant.update({
    where: { id: tenantId },
    data: { plan: tenantPlanFor(planCode), status: status === "CANCELLED" ? "CANCELLED" : "ACTIVE" },
  });
}

/**
 * Activates (or reactivates) a subscription onto a real plan through the
 * `BillingProvider` interface — `ManualBillingProvider` today,
 * `StripeBillingProvider` later without this action changing shape. OWNER
 * only (`billing:manage`), always audited.
 */
export async function activateSubscriptionAction(
  tenantId: string,
  input: ActivatePlanInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "billing", "manage");

  const parsed = activatePlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const plan = await db.plan.findUnique({ where: { code: parsed.data.planCode } });
  if (!plan || !plan.active) return { ok: false, error: "That plan is not available." };

  const subscription = await db.subscription.findUnique({ where: { tenantId } });
  if (!subscription) return { ok: false, error: "No subscription found for this workspace." };

  const current = effectiveStatus(subscription);
  if (!canTransition(current, "ACTIVE")) {
    return { ok: false, error: `A ${current.toLowerCase()} subscription can't be activated directly.` };
  }

  const result = await billingProvider.activateSubscription({ tenantId, planCode: plan.code });
  if (!result.ok) return { ok: false, error: result.message };

  await applyPlanAndStatus(db, tenantId, plan.id, plan.code, "ACTIVE", {
    trialEndsAt: null,
    gracePeriodEndsAt: null,
    currentPeriodEnd: periodEndFor(plan.billingInterval),
  });
  await db.subscriptionEvent.create({
    data: {
      tenantId,
      subscriptionId: subscription.id,
      type: "ACTIVATED",
      message: `Activated plan ${plan.name} via ${billingProvider.provider}.`,
      metadata: { planCode: plan.code, previousStatus: current },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "billing_activate",
    entity: "subscription",
    entityId: subscription.id,
    metadata: { planCode: plan.code, previousStatus: current },
  });
  logger.info("subscription activated", { tenantId, planCode: plan.code });

  return { ok: true };
}

/**
 * Upgrade or downgrade an already-live subscription's plan. A downgrade
 * whose seat limit is below current usage is blocked unless the caller
 * explicitly acknowledges it (`acknowledgeSeatOverage`) — the same
 * explicit-override shape as `paidOverride` in Supplier Order Execution.
 * OWNER only (`billing:manage`), always audited.
 */
export async function changeSubscriptionPlanAction(
  tenantId: string,
  input: ChangePlanInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "billing", "manage");

  const parsed = changePlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const newPlan = await db.plan.findUnique({ where: { code: parsed.data.newPlanCode } });
  if (!newPlan || !newPlan.active) return { ok: false, error: "That plan is not available." };

  const subscription = await db.subscription.findUnique({
    where: { tenantId },
    include: { plan: { select: { code: true } } },
  });
  if (!subscription) return { ok: false, error: "No subscription found for this workspace." };

  const current = effectiveStatus(subscription);
  if (current === "CANCELLED" || current === "SUSPENDED" || current === "EXPIRED") {
    return {
      ok: false,
      error: `A ${current.toLowerCase()} subscription must be reactivated before changing plans.`,
    };
  }
  if (subscription.plan.code === newPlan.code) {
    return { ok: false, error: "The workspace is already on this plan." };
  }

  if (newPlan.seatLimit != null) {
    const seatCheck = await checkSeatLimit(db, tenantId);
    if (seatCheck.used > newPlan.seatLimit && !parsed.data.acknowledgeSeatOverage) {
      return {
        ok: false,
        error: `This workspace uses ${seatCheck.used} seat(s), which is more than the ${newPlan.name} plan's limit of ${newPlan.seatLimit}. Confirm the downgrade to proceed — no seats will be removed automatically.`,
      };
    }
  }

  const result = await billingProvider.changePlan({ tenantId, newPlanCode: newPlan.code });
  if (!result.ok) return { ok: false, error: result.message };

  await applyPlanAndStatus(db, tenantId, newPlan.id, newPlan.code, "ACTIVE", {
    // Clears a lingering trial/grace-period date the same way
    // `activateSubscriptionAction` does — a plan change can move a
    // TRIALING or PAST_DUE subscription to ACTIVE too, and an ACTIVE
    // subscription should never carry a stale trial or grace-period end.
    trialEndsAt: null,
    gracePeriodEndsAt: null,
    currentPeriodEnd: periodEndFor(newPlan.billingInterval),
  });
  await db.subscriptionEvent.create({
    data: {
      tenantId,
      subscriptionId: subscription.id,
      type: "PLAN_CHANGED",
      message: `Changed plan from ${subscription.plan.code} to ${newPlan.code}.`,
      metadata: { fromPlanCode: subscription.plan.code, toPlanCode: newPlan.code },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "billing_change_plan",
    entity: "subscription",
    entityId: subscription.id,
    metadata: {
      fromPlanCode: subscription.plan.code,
      toPlanCode: newPlan.code,
      seatOverageAcknowledged: parsed.data.acknowledgeSeatOverage ?? false,
    },
  });
  logger.info("subscription plan changed", { tenantId, fromPlanCode: subscription.plan.code, toPlanCode: newPlan.code });

  return { ok: true };
}

/**
 * Cancels a subscription. Terminal — see `status.ts`'s `ALLOWED_TRANSITIONS`.
 * OWNER only (`billing:manage`), always audited.
 */
export async function cancelSubscriptionAction(tenantId: string): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "billing", "manage");

  const subscription = await db.subscription.findUnique({
    where: { tenantId },
    include: { plan: { select: { code: true } } },
  });
  if (!subscription) return { ok: false, error: "No subscription found for this workspace." };

  const current = effectiveStatus(subscription);
  if (current === "CANCELLED") return { ok: false, error: "This subscription is already cancelled." };

  const result = await billingProvider.cancelSubscription({ tenantId });
  if (!result.ok) return { ok: false, error: result.message };

  await applyPlanAndStatus(db, tenantId, subscription.planId, subscription.plan.code, "CANCELLED", {
    cancelledAt: new Date(),
  });
  await db.subscriptionEvent.create({
    data: {
      tenantId,
      subscriptionId: subscription.id,
      type: "CANCELLED",
      message: "Subscription cancelled.",
      metadata: { previousStatus: current },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "billing_cancel",
    entity: "subscription",
    entityId: subscription.id,
    metadata: { previousStatus: current },
  });
  logger.info("subscription cancelled", { tenantId });

  return { ok: true };
}
