import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";
import { computeTotals } from "@/shared/lib/money";

/**
 * Re-derive an invoice's stored `subtotal`/`total` from its current line
 * items plus its discount/tax, and persist them. Called after any item
 * mutation and after a discount/tax change so the stored figures never drift
 * from the lines. Only ever runs on DRAFT invoices (issued lines are locked).
 * Single-record `update` is scoped explicitly by `tenantId` (see db.ts).
 */
export async function recomputeInvoiceTotals(
  db: TenantDb,
  tenantId: string,
  invoiceId: string,
): Promise<void> {
  const [items, invoice] = await Promise.all([
    db.invoiceItem.findMany({
      where: { invoiceId },
      select: { quantity: true, unitPrice: true },
    }),
    db.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: { discount: true, tax: true },
    }),
  ]);
  if (!invoice) return;

  const totals = computeTotals({
    items: items.map((i) => ({ quantity: i.quantity, unitPrice: toNumber(i.unitPrice) ?? 0 })),
    discount: toNumber(invoice.discount) ?? 0,
    tax: toNumber(invoice.tax) ?? 0,
  });

  await db.invoice.update({
    where: { id: invoiceId, tenantId },
    data: { subtotal: totals.subtotal, total: totals.total },
  });
}
