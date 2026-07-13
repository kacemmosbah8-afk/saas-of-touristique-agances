import { toCents, fromCents } from "@/shared/lib/money";
import type { PricingComponent, PricingComponentType } from "@/features/pricing/schemas/pricing.schema";

/**
 * The Universal Pricing Engine's calculation core — the single source of
 * truth for turning a supplier cost into a customer selling price. Pure and
 * deterministic: no I/O, no randomness, same inputs always produce the same
 * output. Every component's `amount`/`percent` is already guaranteed
 * non-negative by `pricingComponentSchema` (see pricing.schema.ts) — this
 * function trusts that guarantee rather than re-validating it, the same
 * "validate once, at the boundary" discipline this codebase applies
 * everywhere else.
 *
 * All arithmetic runs in integer cents (`toCents`/`fromCents` from
 * `shared/lib/money.ts` — the exact same primitive `computeTotals` already
 * uses for bookings/quotes) so floating-point drift never appears in a
 * displayed or charged price.
 *
 * Application order: additive/subtractive components (everything except
 * MIN_MARKUP_PERCENT, MAX_MARKUP_PERCENT, and ROUND_TO_NEAREST) apply
 * strictly in the order they appear in the `components` array — each
 * percentage component compounds on the running total *as adjusted by every
 * component before it*, not on the original cost. MIN/MAX_MARKUP_PERCENT and
 * ROUND_TO_NEAREST are clamps/final steps: wherever they appear in the
 * array, they are applied once, last, after every additive/subtractive
 * component — first the min/max clamp (against the original cost), then
 * rounding.
 */

export type PricingBreakdownLine = {
  type: PricingComponentType;
  /** Signed cents delta this component contributed (negative for discounts/coupons). */
  delta: number;
};

export type PricingResult = {
  /** The supplier's raw cost this was priced from — never displayed to a customer. */
  cost: number;
  /** What the customer is actually charged — the only figure that may reach the UI. */
  sellingPrice: number;
  /** sellingPrice − cost. */
  profit: number;
  /** profit ÷ sellingPrice × 100 (gross margin, not markup — see PROJECT.md
   * for the distinction). 0 when sellingPrice is 0. */
  marginPercent: number;
  currency: string;
  breakdown: PricingBreakdownLine[];
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculatePrice(
  cost: number,
  currency: string,
  components: readonly PricingComponent[],
): PricingResult {
  // Defensive floor — a negative or non-finite cost is a caller bug, not a
  // pricing decision; never let it become a negative selling price.
  const safeCost = Number.isFinite(cost) && cost > 0 ? cost : 0;
  const costCents = toCents(safeCost);

  let runningCents = costCents;
  const breakdown: PricingBreakdownLine[] = [];
  let minMarkupPercent: number | null = null;
  let maxMarkupPercent: number | null = null;
  let roundToUnit: number | null = null;

  for (const component of components) {
    const before = runningCents;
    switch (component.type) {
      case "MARKUP_FIXED":
      case "FEE_FIXED":
        runningCents += toCents(component.amount);
        break;
      case "MARKUP_PERCENT":
      case "COMMISSION_PERCENT":
      case "FEE_PERCENT":
      case "TAX_PERCENT":
        runningCents += Math.round((runningCents * component.percent) / 100);
        break;
      case "DISCOUNT_FIXED":
      case "COUPON_FIXED":
        runningCents -= toCents(component.amount);
        break;
      case "DISCOUNT_PERCENT":
      case "PROMO_PERCENT":
        runningCents -= Math.round((runningCents * component.percent) / 100);
        break;
      case "MIN_MARKUP_PERCENT":
        minMarkupPercent = component.percent;
        continue; // clamp, not a step — no breakdown line here
      case "MAX_MARKUP_PERCENT":
        maxMarkupPercent = component.percent;
        continue;
      case "ROUND_TO_NEAREST":
        roundToUnit = component.unit;
        continue;
    }
    breakdown.push({ type: component.type, delta: runningCents - before });
  }

  // A discount/coupon run can never produce a negative charge, regardless
  // of how large it was configured — floor at zero, not at cost, since an
  // agency may deliberately price a loss-leader line.
  runningCents = Math.max(0, runningCents);

  if (minMarkupPercent != null) {
    const floorCents = Math.round(costCents * (1 + minMarkupPercent / 100));
    if (runningCents < floorCents) {
      breakdown.push({ type: "MIN_MARKUP_PERCENT", delta: floorCents - runningCents });
      runningCents = floorCents;
    }
  }
  if (maxMarkupPercent != null) {
    const ceilingCents = Math.round(costCents * (1 + maxMarkupPercent / 100));
    if (runningCents > ceilingCents) {
      breakdown.push({ type: "MAX_MARKUP_PERCENT", delta: ceilingCents - runningCents });
      runningCents = ceilingCents;
    }
  }
  if (roundToUnit != null) {
    const unitCents = toCents(roundToUnit);
    if (unitCents > 0) {
      const rounded = Math.round(runningCents / unitCents) * unitCents;
      if (rounded !== runningCents) {
        breakdown.push({ type: "ROUND_TO_NEAREST", delta: rounded - runningCents });
      }
      runningCents = rounded;
    }
  }

  const sellingPrice = fromCents(runningCents);
  const profit = fromCents(runningCents - costCents);
  const marginPercent = runningCents > 0 ? round2((profit / sellingPrice) * 100) : 0;

  return { cost: safeCost, sellingPrice, profit, marginPercent, currency, breakdown };
}
