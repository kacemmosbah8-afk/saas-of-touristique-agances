/**
 * Booking money math, kept pure and integer-cents based so it can be unit
 * tested and reused. Prisma returns `Decimal`; callers convert to numbers at
 * the boundary (see `toNumber`) before calling in, and the action layer writes
 * plain numbers back — Prisma accepts number/string for Decimal columns.
 *
 * All arithmetic is done in integer cents to avoid binary floating-point drift
 * (0.1 + 0.2 !== 0.3), then converted back to a 2-dp number at the end.
 */

export type LineInput = {
  quantity: number;
  unitPrice: number;
};

export type BookingTotalsInput = {
  items: readonly LineInput[];
  discount: number;
  tax: number;
};

export type BookingTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

const toCents = (value: number): number => Math.round(value * 100);
const fromCents = (cents: number): number => cents / 100;

/** quantity * unitPrice for a single line, rounded to cents. */
export function lineAmount(quantity: number, unitPrice: number): number {
  const q = Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0;
  return fromCents(q * toCents(unitPrice));
}

/**
 * Compute a booking's stored totals from its line items and adjustments.
 * `total` is clamped at zero so a discount larger than the subtotal can never
 * produce a negative amount owed.
 */
export function computeTotals({ items, discount, tax }: BookingTotalsInput): BookingTotals {
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
