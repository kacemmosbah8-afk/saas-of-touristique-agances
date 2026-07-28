import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";
import { computeTotals } from "@/shared/lib/money";

/**
 * Re-derive a quote's stored `subtotal`/`total` from its current line items
 * plus its discount/tax, and persist them. Called after any item mutation and
 * after a discount/tax change so the stored figures never drift from the lines.
 * Single-record `update` is scoped explicitly by `tenantId` (see db.ts).
 */
export async function recomputeQuoteTotals(
  db: TenantDb,
  tenantId: string,
  quoteId: string,
): Promise<void> {
  const [items, quote] = await Promise.all([
    db.quoteItem.findMany({
      where: { quoteId },
      select: { quantity: true, unitPrice: true },
    }),
    db.quote.findFirst({
      where: { id: quoteId, tenantId },
      select: { discount: true, tax: true },
    }),
  ]);
  if (!quote) return;

  const totals = computeTotals({
    items: items.map((i) => ({ quantity: i.quantity, unitPrice: toNumber(i.unitPrice) ?? 0 })),
    discount: toNumber(quote.discount) ?? 0,
    tax: toNumber(quote.tax) ?? 0,
  });

  await db.quote.update({
    where: { id: quoteId, tenantId },
    data: { subtotal: totals.subtotal, total: totals.total },
  });
}
