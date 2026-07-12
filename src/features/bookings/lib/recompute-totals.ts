import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";
import { computeTotals } from "@/features/bookings/lib/totals";

/**
 * Re-derive a booking's stored `subtotal`/`total` from its current line items
 * plus its discount/tax, and persist them. Called after any item mutation and
 * after a discount/tax change so the stored figures never drift from the lines.
 * Single-record `update` is scoped explicitly by `tenantId` (see db.ts).
 */
export async function recomputeBookingTotals(
  db: TenantDb,
  tenantId: string,
  bookingId: string,
): Promise<void> {
  const [items, booking] = await Promise.all([
    db.bookingItem.findMany({
      where: { bookingId },
      select: { quantity: true, unitPrice: true },
    }),
    db.booking.findFirst({
      where: { id: bookingId, tenantId },
      select: { discount: true, tax: true },
    }),
  ]);
  if (!booking) return;

  const totals = computeTotals({
    items: items.map((i) => ({ quantity: i.quantity, unitPrice: toNumber(i.unitPrice) ?? 0 })),
    discount: toNumber(booking.discount) ?? 0,
    tax: toNumber(booking.tax) ?? 0,
  });

  await db.booking.update({
    where: { id: bookingId, tenantId },
    data: { subtotal: totals.subtotal, total: totals.total },
  });
}
