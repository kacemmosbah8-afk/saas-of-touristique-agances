"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import { lineAmount } from "@/shared/lib/money";
import type { ActionResult } from "@/shared/types/action-result";
import {
  invoiceItemSchema,
  type InvoiceItemInput,
} from "@/features/invoices/schemas/invoice.schema";
import { canEditItems, INVOICE_STATUS_LABELS } from "@/features/invoices/lib/invoice-status";
import { recomputeInvoiceTotals } from "@/features/invoices/lib/recompute-totals";

/** Line items can only change while the invoice is still a draft. */
async function requireEditableInvoice(
  db: Awaited<ReturnType<typeof requirePermission>>["db"],
  tenantId: string,
  invoiceId: string,
): Promise<ActionResult<{ ok: true }>> {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId, deletedAt: null },
    select: { status: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (!canEditItems(invoice.status)) {
    return {
      ok: false,
      error: `A ${INVOICE_STATUS_LABELS[invoice.status].toLowerCase()} invoice's items can't be changed.`,
    };
  }
  return { ok: true, data: { ok: true } };
}

export async function addInvoiceItemAction(
  tenantId: string,
  invoiceId: string,
  input: InvoiceItemInput,
): Promise<ActionResult<{ itemId: string }>> {
  const { session, db } = await requirePermission(tenantId, "invoice", "update");

  const parsed = invoiceItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item." };
  }

  const guard = await requireEditableInvoice(db, tenantId, invoiceId);
  if (!guard.ok) return guard;

  const last = await db.invoiceItem.findFirst({
    where: { invoiceId },
    select: { sortOrder: true },
    orderBy: { sortOrder: "desc" },
  });

  const item = await db.invoiceItem.create({
    data: {
      tenantId,
      invoiceId,
      type: parsed.data.type,
      description: parsed.data.description,
      referenceId: emptyToNull(parsed.data.referenceId),
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      amount: lineAmount(parsed.data.quantity, parsed.data.unitPrice),
      notes: emptyToNull(parsed.data.notes),
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });

  await recomputeInvoiceTotals(db, tenantId, invoiceId);
  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId,
      userId: session.user.id,
      type: "ITEM_ADDED",
      title: `Added ${parsed.data.description}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "item_add",
    entity: "invoice",
    entityId: invoiceId,
    metadata: { itemId: item.id },
  });
  return { ok: true, data: { itemId: item.id } };
}

export async function updateInvoiceItemAction(
  tenantId: string,
  invoiceId: string,
  itemId: string,
  input: InvoiceItemInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "invoice", "update");

  const parsed = invoiceItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item." };
  }

  const guard = await requireEditableInvoice(db, tenantId, invoiceId);
  if (!guard.ok) return guard;

  const existing = await db.invoiceItem.findFirst({
    where: { id: itemId, invoiceId, tenantId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Item not found." };

  await db.invoiceItem.update({
    where: { id: itemId },
    data: {
      type: parsed.data.type,
      description: parsed.data.description,
      referenceId: emptyToNull(parsed.data.referenceId),
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      amount: lineAmount(parsed.data.quantity, parsed.data.unitPrice),
      notes: emptyToNull(parsed.data.notes),
    },
  });

  await recomputeInvoiceTotals(db, tenantId, invoiceId);
  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId,
      userId: session.user.id,
      type: "ITEM_UPDATED",
      title: `Updated ${parsed.data.description}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "item_update",
    entity: "invoice",
    entityId: invoiceId,
    metadata: { itemId },
  });
  return { ok: true };
}

export async function removeInvoiceItemAction(
  tenantId: string,
  invoiceId: string,
  itemId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "invoice", "update");

  const guard = await requireEditableInvoice(db, tenantId, invoiceId);
  if (!guard.ok) return guard;

  const existing = await db.invoiceItem.findFirst({
    where: { id: itemId, invoiceId, tenantId },
    select: { description: true },
  });
  if (!existing) return { ok: false, error: "Item not found." };

  await db.invoiceItem.delete({ where: { id: itemId } });

  await recomputeInvoiceTotals(db, tenantId, invoiceId);
  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId,
      userId: session.user.id,
      type: "ITEM_REMOVED",
      title: `Removed ${existing.description}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "item_remove",
    entity: "invoice",
    entityId: invoiceId,
    metadata: { itemId },
  });
  return { ok: true };
}
