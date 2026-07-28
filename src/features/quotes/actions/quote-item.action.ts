"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import { lineAmount } from "@/shared/lib/money";
import type { ActionResult } from "@/shared/types/action-result";
import { quoteItemSchema, type QuoteItemInput } from "@/features/quotes/schemas/quote.schema";
import { canEditItems, QUOTE_STATUS_LABELS } from "@/features/quotes/lib/quote-status";
import { recomputeQuoteTotals } from "@/features/quotes/lib/recompute-totals";

/** Line items can only change while the quote is still editable (draft/sent). */
async function requireEditableQuote(
  db: Awaited<ReturnType<typeof requirePermission>>["db"],
  tenantId: string,
  quoteId: string,
): Promise<ActionResult<{ ok: true }>> {
  const quote = await db.quote.findFirst({
    where: { id: quoteId, tenantId, deletedAt: null },
    select: { status: true },
  });
  if (!quote) return { ok: false, error: "Quote not found." };
  if (!canEditItems(quote.status)) {
    return {
      ok: false,
      error: `A ${QUOTE_STATUS_LABELS[quote.status].toLowerCase()} quote's items can't be changed.`,
    };
  }
  return { ok: true, data: { ok: true } };
}

export async function addQuoteItemAction(
  tenantId: string,
  quoteId: string,
  input: QuoteItemInput,
): Promise<ActionResult<{ itemId: string }>> {
  const { session, db } = await requirePermission(tenantId, "quote", "update");

  const parsed = quoteItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item." };
  }

  const guard = await requireEditableQuote(db, tenantId, quoteId);
  if (!guard.ok) return guard;

  const last = await db.quoteItem.findFirst({
    where: { quoteId },
    select: { sortOrder: true },
    orderBy: { sortOrder: "desc" },
  });

  const item = await db.quoteItem.create({
    data: {
      tenantId,
      quoteId,
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

  await recomputeQuoteTotals(db, tenantId, quoteId);
  await db.quoteActivity.create({
    data: {
      tenantId,
      quoteId,
      userId: session.user.id,
      type: "ITEM_ADDED",
      title: `Added ${parsed.data.description}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "item_add",
    entity: "quote",
    entityId: quoteId,
    metadata: { itemId: item.id },
  });
  return { ok: true, data: { itemId: item.id } };
}

export async function updateQuoteItemAction(
  tenantId: string,
  quoteId: string,
  itemId: string,
  input: QuoteItemInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "quote", "update");

  const parsed = quoteItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item." };
  }

  const guard = await requireEditableQuote(db, tenantId, quoteId);
  if (!guard.ok) return guard;

  const existing = await db.quoteItem.findFirst({
    where: { id: itemId, quoteId, tenantId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Item not found." };

  await db.quoteItem.update({
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

  await recomputeQuoteTotals(db, tenantId, quoteId);
  await db.quoteActivity.create({
    data: {
      tenantId,
      quoteId,
      userId: session.user.id,
      type: "ITEM_UPDATED",
      title: `Updated ${parsed.data.description}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "item_update",
    entity: "quote",
    entityId: quoteId,
    metadata: { itemId },
  });
  return { ok: true };
}

export async function removeQuoteItemAction(
  tenantId: string,
  quoteId: string,
  itemId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "quote", "update");

  const guard = await requireEditableQuote(db, tenantId, quoteId);
  if (!guard.ok) return guard;

  const existing = await db.quoteItem.findFirst({
    where: { id: itemId, quoteId, tenantId },
    select: { description: true },
  });
  if (!existing) return { ok: false, error: "Item not found." };

  await db.quoteItem.delete({ where: { id: itemId } });

  await recomputeQuoteTotals(db, tenantId, quoteId);
  await db.quoteActivity.create({
    data: {
      tenantId,
      quoteId,
      userId: session.user.id,
      type: "ITEM_REMOVED",
      title: `Removed ${existing.description}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "item_remove",
    entity: "quote",
    entityId: quoteId,
    metadata: { itemId },
  });
  return { ok: true };
}
