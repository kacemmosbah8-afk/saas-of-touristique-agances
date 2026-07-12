"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import { computeBalance, sumAmounts } from "@/shared/lib/money";
import { toNumber } from "@/shared/lib/list-query";
import type { ActionResult } from "@/shared/types/action-result";
import {
  recordPaymentSchema,
  refundPaymentSchema,
  type RecordPaymentInput,
  type RefundPaymentInput,
} from "@/features/payments/schemas/payment.schema";
import { formatPaymentReference } from "@/features/payments/lib/payment-reference";
import {
  canRecordPayment,
  INVOICE_STATUS_LABELS,
} from "@/features/invoices/lib/invoice-status";
import { recomputeInvoiceBalance } from "@/features/invoices/lib/recompute-balance";

type TenantDbFrom = Awaited<ReturnType<typeof requirePermission>>["db"];

async function nextPaymentReference(db: TenantDbFrom, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await db.payment.count({
    where: { tenantId, createdAt: { gte: start, lt: end } },
  });
  return formatPaymentReference(year, count + 1);
}

/**
 * Record a payment received against an invoice. Writes the Payment plus its
 * CHARGE ledger transaction, then recomputes the invoice balance (which also
 * moves the invoice to PARTIALLY_PAID/PAID and settles a linked
 * installment). Overpayment is rejected: the amount may not exceed the
 * balance due — a genuine excess receipt should be recorded up to the
 * balance and the remainder handled explicitly, not buried in an
 * over-settled invoice. Currency always matches the invoice (no
 * cross-currency settlement in this sprint).
 */
export async function recordPaymentAction(
  tenantId: string,
  invoiceId: string,
  input: RecordPaymentInput,
): Promise<ActionResult<{ paymentId: string }>> {
  const { session, db } = await requirePermission(tenantId, "payment", "create");

  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId, deletedAt: null },
    select: {
      status: true,
      reference: true,
      currency: true,
      total: true,
      amountPaid: true,
      amountRefunded: true,
      amountCredited: true,
      installmentPlan: { select: { installments: { select: { id: true } } } },
    },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (!canRecordPayment(invoice.status)) {
    return {
      ok: false,
      error: `Payments can't be recorded on a ${INVOICE_STATUS_LABELS[invoice.status].toLowerCase()} invoice.`,
    };
  }

  const balance = computeBalance({
    total: toNumber(invoice.total) ?? 0,
    paid: toNumber(invoice.amountPaid) ?? 0,
    refunded: toNumber(invoice.amountRefunded) ?? 0,
    credited: toNumber(invoice.amountCredited) ?? 0,
  });
  if (parsed.data.amount > balance.balanceDue) {
    return {
      ok: false,
      error: `Amount exceeds the balance due (${balance.balanceDue.toFixed(2)} ${invoice.currency}).`,
    };
  }

  const installmentId = emptyToNull(parsed.data.installmentId);
  if (installmentId) {
    const planInstallmentIds = new Set(
      invoice.installmentPlan?.installments.map((i) => i.id) ?? [],
    );
    if (!planInstallmentIds.has(installmentId)) {
      return { ok: false, error: "That installment doesn't belong to this invoice." };
    }
  }

  const receivedAt = parsed.data.receivedAt ? new Date(parsed.data.receivedAt) : new Date();
  const pending = parsed.data.pending === true;
  const reference = await nextPaymentReference(db, tenantId);

  const payment = await db.payment.create({
    data: {
      tenantId,
      reference,
      invoiceId,
      installmentId,
      method: parsed.data.method,
      kind: parsed.data.kind ?? "BALANCE",
      status: pending ? "PENDING" : "COMPLETED",
      amount: parsed.data.amount,
      currency: invoice.currency,
      receivedAt,
      externalReference: emptyToNull(parsed.data.externalReference),
      notes: emptyToNull(parsed.data.notes),
      recordedBy: session.user.id,
      // The CHARGE ledger row is written together with the payment.
      transactions: {
        create: {
          tenantId,
          type: "CHARGE",
          amount: parsed.data.amount,
          reference: emptyToNull(parsed.data.externalReference),
          occurredAt: receivedAt,
          createdBy: session.user.id,
        },
      },
    },
    select: { id: true },
  });

  await db.paymentActivity.create({
    data: {
      tenantId,
      paymentId: payment.id,
      userId: session.user.id,
      type: "CREATED",
      title: pending
        ? `Payment ${reference} recorded (pending)`
        : `Payment ${reference} recorded`,
      metadata: { amount: parsed.data.amount, method: parsed.data.method },
    },
  });

  // A pending payment doesn't move the balance, but the recompute is cheap
  // and keeps one code path.
  await recomputeInvoiceBalance(db, tenantId, invoiceId);

  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId,
      userId: session.user.id,
      type: "PAYMENT_RECORDED",
      title: `Payment ${reference} — ${parsed.data.amount.toFixed(2)} ${invoice.currency}${pending ? " (pending)" : ""}`,
      metadata: { paymentId: payment.id, amount: parsed.data.amount },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "payment_record",
    entity: "payment",
    entityId: payment.id,
    metadata: { invoiceId, reference, amount: parsed.data.amount, pending },
  });
  logger.info("payment recorded", { tenantId, invoiceId, paymentId: payment.id, reference });
  return { ok: true, data: { paymentId: payment.id } };
}

/** Mark a PENDING payment as arrived — it now counts toward the balance. */
export async function completePaymentAction(
  tenantId: string,
  paymentId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "payment", "update");

  const payment = await db.payment.findFirst({
    where: { id: paymentId, tenantId },
    select: { status: true, invoiceId: true, reference: true },
  });
  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.status === "COMPLETED") return { ok: true };
  if (payment.status !== "PENDING") {
    return { ok: false, error: "Only a pending payment can be completed." };
  }

  await db.payment.update({
    where: { id: paymentId, tenantId },
    data: { status: "COMPLETED" },
  });

  await recomputeInvoiceBalance(db, tenantId, payment.invoiceId);
  await db.paymentActivity.create({
    data: {
      tenantId,
      paymentId,
      userId: session.user.id,
      type: "COMPLETED",
      title: `Payment ${payment.reference} completed`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "payment_complete",
    entity: "payment",
    entityId: paymentId,
    metadata: { invoiceId: payment.invoiceId },
  });
  logger.info("payment completed", { tenantId, paymentId });
  return { ok: true };
}

/** Mark a PENDING payment as failed (never arrived). It never counted. */
export async function failPaymentAction(
  tenantId: string,
  paymentId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "payment", "update");

  const payment = await db.payment.findFirst({
    where: { id: paymentId, tenantId },
    select: { status: true, invoiceId: true, reference: true },
  });
  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.status === "FAILED") return { ok: true };
  if (payment.status !== "PENDING") {
    return { ok: false, error: "Only a pending payment can be marked failed." };
  }

  await db.payment.update({
    where: { id: paymentId, tenantId },
    data: { status: "FAILED" },
  });

  await recomputeInvoiceBalance(db, tenantId, payment.invoiceId);
  await db.paymentActivity.create({
    data: {
      tenantId,
      paymentId,
      userId: session.user.id,
      type: "FAILED",
      title: `Payment ${payment.reference} marked failed`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "payment_fail",
    entity: "payment",
    entityId: paymentId,
    metadata: { invoiceId: payment.invoiceId },
  });
  logger.info("payment failed", { tenantId, paymentId });
  return { ok: true };
}

/**
 * Refund part or all of a completed payment. Appends a REFUND ledger
 * transaction (the CHARGE row is never touched), accumulates
 * `refundedAmount`, flips the payment to PARTIALLY_REFUNDED/REFUNDED, and
 * recomputes the invoice balance — which can reopen a PAID invoice back to
 * PARTIALLY_PAID/ISSUED. The refund may never exceed what is left
 * unrefunded on the payment.
 */
export async function refundPaymentAction(
  tenantId: string,
  paymentId: string,
  input: RefundPaymentInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "payment", "manage");

  const parsed = refundPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const payment = await db.payment.findFirst({
    where: { id: paymentId, tenantId },
    select: {
      status: true,
      invoiceId: true,
      reference: true,
      currency: true,
      amount: true,
      refundedAmount: true,
    },
  });
  if (!payment) return { ok: false, error: "Payment not found." };
  if (
    payment.status !== "COMPLETED" &&
    payment.status !== "PARTIALLY_REFUNDED"
  ) {
    return { ok: false, error: "Only a completed payment can be refunded." };
  }

  const amount = toNumber(payment.amount) ?? 0;
  const alreadyRefunded = toNumber(payment.refundedAmount) ?? 0;
  const refundable = sumAmounts([amount, -alreadyRefunded]);
  if (parsed.data.amount > refundable) {
    return {
      ok: false,
      error: `Refund exceeds the refundable amount (${refundable.toFixed(2)} ${payment.currency}).`,
    };
  }

  const newRefunded = sumAmounts([alreadyRefunded, parsed.data.amount]);
  const fullyRefunded = newRefunded >= amount;

  await db.payment.update({
    where: { id: paymentId, tenantId },
    data: {
      refundedAmount: newRefunded,
      status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
      transactions: {
        create: {
          tenantId,
          type: "REFUND",
          amount: parsed.data.amount,
          notes: emptyToNull(parsed.data.reason),
          createdBy: session.user.id,
        },
      },
    },
  });

  await recomputeInvoiceBalance(db, tenantId, payment.invoiceId);
  await db.paymentActivity.create({
    data: {
      tenantId,
      paymentId,
      userId: session.user.id,
      type: "REFUNDED",
      title: `Refunded ${parsed.data.amount.toFixed(2)} ${payment.currency}`,
      description: emptyToNull(parsed.data.reason),
      metadata: { amount: parsed.data.amount },
    },
  });
  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId: payment.invoiceId,
      userId: session.user.id,
      type: "PAYMENT_REFUNDED",
      title: `Payment ${payment.reference} refunded ${parsed.data.amount.toFixed(2)} ${payment.currency}`,
      description: emptyToNull(parsed.data.reason),
      metadata: { paymentId, amount: parsed.data.amount },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "payment_refund",
    entity: "payment",
    entityId: paymentId,
    metadata: { invoiceId: payment.invoiceId, amount: parsed.data.amount },
  });
  logger.info("payment refunded", { tenantId, paymentId, amount: parsed.data.amount });
  return { ok: true };
}
