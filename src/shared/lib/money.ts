/**
 * Shared money math for priced documents (bookings, quotes). Kept pure and
 * integer-cents based so it can be unit tested and reused across features
 * without duplication.
 *
 * Prisma returns `Decimal`; callers convert to numbers at the boundary (see
 * `toNumber` in list-query) before calling in, and the action layer writes
 * plain numbers back — Prisma accepts number/string for Decimal columns.
 *
 * All arithmetic is done in integer cents to avoid binary floating-point drift
 * (0.1 + 0.2 !== 0.3), then converted back to a 2-dp number at the end.
 */

export type LineInput = {
  quantity: number;
  unitPrice: number;
};

export type MoneyTotalsInput = {
  items: readonly LineInput[];
  discount: number;
  tax: number;
};

export type MoneyTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

/** Exported for other integer-cents-safe money math to reuse instead of
 * re-deriving the same rounding rule. */
export const toCents = (value: number): number => Math.round(value * 100);
export const fromCents = (cents: number): number => cents / 100;

/** quantity * unitPrice for a single line, rounded to cents. */
export function lineAmount(quantity: number, unitPrice: number): number {
  const q = Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0;
  return fromCents(q * toCents(unitPrice));
}

/**
 * Compute a priced document's stored totals from its line items and
 * adjustments. `total` is clamped at zero so a discount larger than the
 * subtotal can never produce a negative amount owed.
 */
export function computeTotals({ items, discount, tax }: MoneyTotalsInput): MoneyTotals {
  const subtotalCents = items.reduce(
    (sum, item) => sum + toCents(lineAmount(item.quantity, item.unitPrice)),
    0,
  );
  const discountCents = Math.max(0, toCents(discount));
  const taxCents = Math.max(0, toCents(tax));
  const totalCents = Math.max(0, subtotalCents - discountCents + taxCents);

  return {
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    tax: fromCents(taxCents),
    total: fromCents(totalCents),
  };
}

/** Sum a list of 2-dp amounts without accumulating float drift. */
export function sumAmounts(values: readonly number[]): number {
  return fromCents(values.reduce((sum, v) => sum + toCents(v), 0));
}
