"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import { computeBalance, sumAmounts } from "@/shared/lib/money";
import { toNumber } from "@/shared/lib/list-query";
import type { ActionResult } from "@/shared/types/action-result";
import {
  creditNoteSchema,
  type CreditNoteInput,
} from "@/features/invoices/schemas/invoice.schema";
import {
  canIssueCreditNote,
  INVOICE_STATUS_LABELS,
} from "@/features/invoices/lib/invoice-status";
import { formatCreditNoteReference } from "@/features/invoices/lib/invoice-reference";
import { recomputeInvoiceBalance } from "@/features/invoices/lib/recompute-balance";

type TenantDbFrom = Awaited<ReturnType<typeof requirePermission>>["db"];

async function nextCreditNoteReference(db: TenantDbFrom, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await db.creditNote.count({
    where: { tenantId, createdAt: { gte: start, lt: end } },
  });
  return formatCreditNoteReference(year, count + 1);
}

/**
 * Issue a credit note against an invoice, reducing the amount the customer
 * owes. The note may not exceed what is still owed overall (total − existing
 * credits) — crediting below zero owed is meaningless; money already received
 * is returned through the refund flow, not credit notes.
 */
export async function issueCreditNoteAction(
  tenantId: string,
  invoiceId: string,
  input: CreditNoteInput,
): Promise<ActionResult<{ creditNoteId: string }>> {
  const { session, db } = await requirePermission(tenantId, "invoice", "manage");

  const parsed = creditNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId, deletedAt: null },
    select: { status: true, total: true, amountCredited: true, reference: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (!canIssueCreditNote(invoice.status)) {
    return {
      ok: false,
      error: `A credit note can't be issued on a ${INVOICE_STATUS_LABELS[invoice.status].toLowerCase()} invoice.`,
    };
  }

  const remainingOwed = computeBalance({
    total: toNumber(invoice.total) ?? 0,
    paid: 0,
    refunded: 0,
    credited: toNumber(invoice.amountCredited) ?? 0,
  }).amountOwed;
  if (parsed.data.amount > remainingOwed) {
    return {
      ok: false,
      error: `Credit exceeds the amount still owed (${remainingOwed.toFixed(2)}).`,
    };
  }

  const reference = await nextCreditNoteReference(db, tenantId);
  const note = await db.creditNote.create({
    data: {
      tenantId,
      reference,
      invoiceId,
      amount: parsed.data.amount,
      reason: emptyToNull(parsed.data.reason),
      createdBy: session.user.id,
    },
    select: { id: true },
  });

  await recomputeInvoiceBalance(db, tenantId, invoiceId);
  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId,
      userId: session.user.id,
      type: "CREDIT_NOTE_ISSUED",
      title: `Credit note ${reference} issued`,
      description: emptyToNull(parsed.data.reason),
      metadata: { creditNoteId: note.id, amount: parsed.data.amount },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "credit_note_issue",
    entity: "invoice",
    entityId: invoiceId,
    metadata: { creditNoteId: note.id, reference, amount: parsed.data.amount },
  });
  logger.info("credit note issued", { tenantId, invoiceId, creditNoteId: note.id, reference });
  return { ok: true, data: { creditNoteId: note.id } };
}

/**
 * Void a credit note, restoring the amount owed. The note stays on the
 * record (financial documents are never deleted).
 */
export async function voidCreditNoteAction(
  tenantId: string,
  creditNoteId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "invoice", "manage");

  const note = await db.creditNote.findFirst({
    where: { id: creditNoteId, tenantId },
    select: { id: true, status: true, invoiceId: true, reference: true, amount: true },
  });
  if (!note) return { ok: false, error: "Credit note not found." };
  if (note.status === "VOID") return { ok: true };

  await db.creditNote.update({
    where: { id: creditNoteId, tenantId },
    data: { status: "VOID", voidedAt: new Date() },
  });

  await recomputeInvoiceBalance(db, tenantId, note.invoiceId);
  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId: note.invoiceId,
      userId: session.user.id,
      type: "CREDIT_NOTE_VOIDED",
      title: `Credit note ${note.reference} voided`,
      metadata: { creditNoteId, amount: sumAmounts([toNumber(note.amount) ?? 0]) },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "credit_note_void",
    entity: "invoice",
    entityId: note.invoiceId,
    metadata: { creditNoteId, reference: note.reference },
  });
  logger.info("credit note voided", { tenantId, creditNoteId });
  return { ok: true };
}
