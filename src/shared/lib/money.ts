/**
 * Shared money math for priced documents (bookings, quotes, and any future
 * invoice/order). Kept pure and integer-cents based so it can be unit tested
 * and reused across features without duplication.
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

/** Exported for other integer-cents-safe money math (e.g. the pricing engine)
 * to reuse instead of re-deriving the same rounding rule. */
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

export type BalanceInput = {
  /** The invoice's grand total. */
  total: number;
  /** Sum of completed payment charges. */
  paid: number;
  /** Sum of refunds returned to the customer. */
  refunded: number;
  /** Sum of issued credit notes (reductions of the amount owed). */
  credited: number;
};

export type Balance = {
  /** paid − refunded: money the business currently holds for this document. */
  netPaid: number;
  /** total − credited: what the customer actually owes overall. */
  amountOwed: number;
  /** max(0, amountOwed − netPaid): what remains to collect. */
  balanceDue: number;
  /** True once nothing remains to collect on a positive amount owed. */
  settled: boolean;
};

/**
 * Derive an invoice's outstanding position from its stored money columns.
 * All arithmetic in integer cents; `balanceDue` is clamped at zero so an
 * overpayment or an over-issued credit note never reports a negative debt.
 */
export function computeBalance({ total, paid, refunded, credited }: BalanceInput): Balance {
  const netPaidCents = Math.max(0, toCents(paid) - toCents(refunded));
  const amountOwedCents = Math.max(0, toCents(total) - toCents(credited));
  const balanceDueCents = Math.max(0, amountOwedCents - netPaidCents);

  return {
    netPaid: fromCents(netPaidCents),
    amountOwed: fromCents(amountOwedCents),
    balanceDue: fromCents(balanceDueCents),
    settled: amountOwedCents > 0 && balanceDueCents === 0,
  };
}

/**
 * Split an amount into `parts` cents-exact portions that sum precisely to the
 * input (no rounding drift): every part gets the floor share and the leftover
 * cents are distributed one each to the first parts. Used to build
 * installment schedules.
 */
export function allocateEvenly(amount: number, parts: number): number[] {
  const count = Math.max(1, Math.trunc(parts));
  const totalCents = Math.max(0, toCents(amount));
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return Array.from({ length: count }, (_, i) => fromCents(base + (i < remainder ? 1 : 0)));
}
