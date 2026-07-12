import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";
import { computeBalance, sumAmounts } from "@/shared/lib/money";
import { deriveCollectionStatus } from "@/features/invoices/lib/invoice-status";

/**
 * Re-derive an invoice's stored balance columns (`amountPaid` /
 * `amountRefunded` / `amountCredited`) from its live payments and credit
 * notes, then move its collection status accordingly (ISSUED ↔
 * PARTIALLY_PAID ↔ PAID — the system transitions of the invoice FSM).
 * Called after every payment, refund, and credit-note mutation so the stored
 * position never drifts from the ledger. Also settles/unsettles linked
 * installments from their linked completed payments.
 *
 * DRAFT and VOID invoices are never restatused here (deriveCollectionStatus
 * returns null for them), but their balance columns still recompute so a
 * voided invoice's history remains accurate.
 */
export async function recomputeInvoiceBalance(
  db: TenantDb,
  tenantId: string,
  invoiceId: string,
): Promise<void> {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    select: { status: true, total: true, paidAt: true },
  });
  if (!invoice) return;

  const [payments, creditAgg] = await Promise.all([
    db.payment.findMany({
      where: { invoiceId, status: { in: ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"] } },
      select: { amount: true, refundedAmount: true },
    }),
    db.creditNote.aggregate({
      where: { invoiceId, status: "ISSUED" },
      _sum: { amount: true },
    }),
  ]);

  const amountPaid = sumAmounts(payments.map((p) => toNumber(p.amount) ?? 0));
  const amountRefunded = sumAmounts(payments.map((p) => toNumber(p.refundedAmount) ?? 0));
  const amountCredited = toNumber(creditAgg._sum.amount) ?? 0;

  const balance = computeBalance({
    total: toNumber(invoice.total) ?? 0,
    paid: amountPaid,
    refunded: amountRefunded,
    credited: amountCredited,
  });

  const nextStatus = deriveCollectionStatus(invoice.status, balance.amountOwed, balance.netPaid);

  await db.invoice.update({
    where: { id: invoiceId, tenantId },
    data: {
      amountPaid,
      amountRefunded,
      amountCredited,
      ...(nextStatus && nextStatus !== invoice.status ? { status: nextStatus } : {}),
      // Stamp paidAt on the transition to PAID; clear it if a refund reopens.
      ...(nextStatus === "PAID" && !invoice.paidAt ? { paidAt: new Date() } : {}),
      ...(nextStatus && nextStatus !== "PAID" && invoice.paidAt ? { paidAt: null } : {}),
    },
  });

  await recomputeInstallmentStatuses(db, tenantId, invoiceId);
}

/**
 * Mark each installment of the invoice's plan PAID when its linked completed
 * payments (net of refunds) cover its amount, and back to PENDING when they
 * no longer do (e.g. after a refund).
 */
async function recomputeInstallmentStatuses(
  db: TenantDb,
  tenantId: string,
  invoiceId: string,
): Promise<void> {
  const plan = await db.installmentPlan.findFirst({
    where: { invoiceId, tenantId },
    select: {
      installments: {
        select: { id: true, amount: true, status: true },
      },
    },
  });
  if (!plan || plan.installments.length === 0) return;

  const linkedPayments = await db.payment.findMany({
    where: {
      invoiceId,
      installmentId: { not: null },
      status: { in: ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"] },
    },
    select: { installmentId: true, amount: true, refundedAmount: true },
  });

  const netByInstallment = new Map<string, number>();
  for (const p of linkedPayments) {
    if (!p.installmentId) continue;
    const net = sumAmounts([toNumber(p.amount) ?? 0, -(toNumber(p.refundedAmount) ?? 0)]);
    netByInstallment.set(
      p.installmentId,
      sumAmounts([netByInstallment.get(p.installmentId) ?? 0, net]),
    );
  }

  for (const installment of plan.installments) {
    const net = netByInstallment.get(installment.id) ?? 0;
    const covered = net >= (toNumber(installment.amount) ?? 0);
    if (covered && installment.status !== "PAID") {
      await db.installment.update({
        where: { id: installment.id, tenantId },
        data: { status: "PAID", paidAt: new Date() },
      });
    } else if (!covered && installment.status === "PAID") {
      await db.installment.update({
        where: { id: installment.id, tenantId },
        data: { status: "PENDING", paidAt: null },
      });
    }
  }
}
