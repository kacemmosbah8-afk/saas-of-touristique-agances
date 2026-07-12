"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import { toNumber } from "@/shared/lib/list-query";
import type { ActionResult } from "@/shared/types/action-result";
import {
  installmentPlanSchema,
  type InstallmentPlanInput,
} from "@/features/invoices/schemas/invoice.schema";
import { buildInstallmentSchedule } from "@/features/invoices/lib/installment-schedule";
import { INVOICE_STATUS_LABELS } from "@/features/invoices/lib/invoice-status";

const SCHEDULE_ERRORS: Record<string, string> = {
  TOTAL_NOT_POSITIVE: "The invoice total must be positive.",
  DEPOSIT_NEGATIVE: "The deposit can't be negative.",
  DEPOSIT_NOT_BELOW_TOTAL: "The deposit must be smaller than the invoice total.",
  COUNT_NOT_POSITIVE: "Schedule at least one installment.",
  INTERVAL_NOT_POSITIVE: "The interval must be at least one day.",
};

/**
 * Create a payment schedule for an ISSUED invoice: an optional deposit plus N
 * installments generated cents-exact from the invoice's amount owed (total −
 * credits) — the schedule always sums precisely to what the customer owes.
 * Issued-only because a draft's total can still change; one plan per invoice
 * (`@@unique(invoiceId)`).
 */
export async function createInstallmentPlanAction(
  tenantId: string,
  invoiceId: string,
  input: InstallmentPlanInput,
): Promise<ActionResult<{ planId: string }>> {
  const { session, db } = await requirePermission(tenantId, "invoice", "update");

  const parsed = installmentPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId, deletedAt: null },
    select: {
      status: true,
      total: true,
      amountCredited: true,
      installmentPlan: { select: { id: true } },
    },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status !== "ISSUED" && invoice.status !== "PARTIALLY_PAID") {
    return {
      ok: false,
      error: `A payment plan can't be added to a ${INVOICE_STATUS_LABELS[invoice.status].toLowerCase()} invoice.`,
    };
  }
  if (invoice.installmentPlan) {
    return { ok: false, error: "This invoice already has a payment plan — remove it first." };
  }

  const scheduleTotal =
    (toNumber(invoice.total) ?? 0) - (toNumber(invoice.amountCredited) ?? 0);
  const schedule = buildInstallmentSchedule({
    total: scheduleTotal,
    depositAmount: parsed.data.depositAmount ?? 0,
    installmentCount: parsed.data.installmentCount,
    firstDueDate: new Date(parsed.data.firstDueDate),
    intervalDays: parsed.data.intervalDays,
  });
  if (!schedule.ok) {
    return { ok: false, error: SCHEDULE_ERRORS[schedule.error] ?? "Invalid schedule." };
  }

  const plan = await db.installmentPlan.create({
    data: {
      tenantId,
      invoiceId,
      depositAmount: parsed.data.depositAmount ?? 0,
      installmentCount: parsed.data.installmentCount,
      notes: emptyToNull(parsed.data.notes),
      createdBy: session.user.id,
      installments: {
        create: schedule.installments.map((i) => ({
          tenantId,
          sequence: i.sequence,
          label: i.label,
          dueDate: i.dueDate,
          amount: i.amount,
        })),
      },
    },
    select: { id: true },
  });

  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId,
      userId: session.user.id,
      type: "INSTALLMENT_PLAN_CREATED",
      title: `Payment plan created (${schedule.installments.length} scheduled amounts)`,
      metadata: {
        planId: plan.id,
        depositAmount: parsed.data.depositAmount ?? 0,
        installmentCount: parsed.data.installmentCount,
      },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "installment_plan_create",
    entity: "invoice",
    entityId: invoiceId,
    metadata: { planId: plan.id },
  });
  logger.info("installment plan created", { tenantId, invoiceId, planId: plan.id });
  return { ok: true, data: { planId: plan.id } };
}

/**
 * Remove an invoice's payment plan. Blocked once any payment is linked to
 * one of its installments — the schedule has become financial history; the
 * linked payments would dangle.
 */
export async function removeInstallmentPlanAction(
  tenantId: string,
  invoiceId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "invoice", "update");

  const plan = await db.installmentPlan.findFirst({
    where: { invoiceId, tenantId },
    select: { id: true, installments: { select: { id: true } } },
  });
  if (!plan) return { ok: false, error: "This invoice has no payment plan." };

  const linked = await db.payment.count({
    where: { invoiceId, installmentId: { in: plan.installments.map((i) => i.id) } },
  });
  if (linked > 0) {
    return {
      ok: false,
      error: "Payments are already linked to this plan's installments — it can't be removed.",
    };
  }

  await db.installmentPlan.delete({ where: { id: plan.id } });

  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId,
      userId: session.user.id,
      type: "INSTALLMENT_PLAN_REMOVED",
      title: "Payment plan removed",
      metadata: { planId: plan.id },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "installment_plan_remove",
    entity: "invoice",
    entityId: invoiceId,
    metadata: { planId: plan.id },
  });
  logger.info("installment plan removed", { tenantId, invoiceId, planId: plan.id });
  return { ok: true };
}
