import { describe, it, expect } from "vitest";

import { calculatePrice } from "@/features/pricing/lib/calculate";
import type { PricingComponent } from "@/features/pricing/schemas/pricing.schema";

describe("calculatePrice", () => {
  it("returns the cost unchanged with zero markup (no components)", () => {
    const result = calculatePrice(100, "EUR", []);
    expect(result).toEqual({
      cost: 100,
      sellingPrice: 100,
      profit: 0,
      marginPercent: 0,
      currency: "EUR",
      breakdown: [],
    });
  });

  it("applies a percentage markup", () => {
    const result = calculatePrice(100, "EUR", [{ type: "MARKUP_PERCENT", percent: 15 }]);
    expect(result.sellingPrice).toBe(115);
    expect(result.profit).toBe(15);
    expect(result.marginPercent).toBeCloseTo(13.04, 2); // 15/115 * 100
  });

  it("applies a fixed markup", () => {
    const result = calculatePrice(100, "EUR", [{ type: "MARKUP_FIXED", amount: 20 }]);
    expect(result.sellingPrice).toBe(120);
    expect(result.profit).toBe(20);
  });

  it("applies commission the same way as markup, tagged separately in the breakdown", () => {
    const result = calculatePrice(100, "EUR", [{ type: "COMMISSION_PERCENT", percent: 10 }]);
    expect(result.sellingPrice).toBe(110);
    expect(result.breakdown).toEqual([{ type: "COMMISSION_PERCENT", delta: 1000 }]);
  });

  it("applies fixed and percentage fees, and a tax placeholder", () => {
    const result = calculatePrice(100, "EUR", [
      { type: "FEE_FIXED", amount: 5 },
      { type: "FEE_PERCENT", percent: 10 },
      { type: "TAX_PERCENT", percent: 5 },
    ]);
    // 100 -> +5 = 105 -> +10% = 115.5 -> +5% = 121.275 -> rounds to 121.28 (cents)
    expect(result.sellingPrice).toBe(121.28);
  });

  it("mixed rules compound in array order, not against the original cost each time", () => {
    const components: PricingComponent[] = [
      { type: "MARKUP_PERCENT", percent: 10 }, // 100 -> 110
      { type: "MARKUP_FIXED", amount: 10 }, // 110 -> 120
      { type: "DISCOUNT_PERCENT", percent: 10 }, // 120 -> 108
    ];
    const result = calculatePrice(100, "EUR", components);
    expect(result.sellingPrice).toBe(108);
  });

  it("applies fixed and percentage discounts, coupons, and promos as subtractions", () => {
    const result = calculatePrice(200, "EUR", [
      { type: "MARKUP_PERCENT", percent: 50 }, // 200 -> 300
      { type: "DISCOUNT_FIXED", amount: 20 }, // -> 280
      { type: "DISCOUNT_PERCENT", percent: 10 }, // -> 252
      { type: "COUPON_FIXED", amount: 2, code: "SAVE2" }, // -> 250
      { type: "PROMO_PERCENT", percent: 10 }, // -> 225
    ]);
    expect(result.sellingPrice).toBe(225);
  });

  it("floors the selling price at zero when discounts exceed the running total", () => {
    const result = calculatePrice(10, "EUR", [{ type: "DISCOUNT_FIXED", amount: 50 }]);
    expect(result.sellingPrice).toBe(0);
    expect(result.profit).toBe(-10);
  });

  it("applies a minimum markup floor even when other rules would price lower", () => {
    const result = calculatePrice(100, "EUR", [
      { type: "DISCOUNT_PERCENT", percent: 90 }, // -> 10
      { type: "MIN_MARKUP_PERCENT", percent: 5 }, // floor at 105
    ]);
    expect(result.sellingPrice).toBe(105);
  });

  it("applies a maximum markup ceiling even when other rules would price higher", () => {
    const result = calculatePrice(100, "EUR", [
      { type: "MARKUP_PERCENT", percent: 500 }, // -> 600 (large markup)
      { type: "MAX_MARKUP_PERCENT", percent: 20 }, // ceiling at 120
    ]);
    expect(result.sellingPrice).toBe(120);
    expect(result.profit).toBe(20);
  });

  it("handles a large markup with no ceiling configured", () => {
    const result = calculatePrice(50, "EUR", [{ type: "MARKUP_PERCENT", percent: 900 }]);
    expect(result.sellingPrice).toBe(500);
    expect(result.profit).toBe(450);
  });

  it("rounds to the nearest configured unit as a final step", () => {
    const result = calculatePrice(100, "EUR", [
      { type: "MARKUP_PERCENT", percent: 17 }, // -> 117
      { type: "ROUND_TO_NEAREST", unit: 5 },
    ]);
    expect(result.sellingPrice).toBe(115);
  });

  it("is currency-precision-safe against classic float drift (0.1 + 0.2 style cases)", () => {
    // Naive float arithmetic gives 0.1 + 0.2 === 0.30000000000000004; the
    // integer-cents path must land on the exact 2dp value instead.
    const result = calculatePrice(10.1, "EUR", [{ type: "MARKUP_FIXED", amount: 0.2 }]);
    expect(result.sellingPrice).toBe(10.3);
  });

  it("rounds fractional-cent results deterministically to exactly 2 decimal places", () => {
    const result = calculatePrice(33.33, "EUR", [{ type: "MARKUP_PERCENT", percent: 33.33 }]);
    // 3333 cents + round(3333 * 33.33 / 100 = 1110.888...) = 3333 + 1111 = 4444 cents
    expect(result.sellingPrice).toBe(44.44);
  });

  it("regression: a Hotelbeds net cost run through a configured markup is no longer equal to cost", () => {
    // The exact defect the Phase A audit found: the raw Hotelbeds `net` rate
    // reaching the customer unchanged. With any configured markup, that must
    // no longer hold.
    const hotelbedsNetRate = 241;
    const result = calculatePrice(hotelbedsNetRate, "EUR", [{ type: "MARKUP_PERCENT", percent: 18 }]);
    expect(result.sellingPrice).not.toBe(hotelbedsNetRate);
    expect(result.sellingPrice).toBeGreaterThan(hotelbedsNetRate);
    expect(result.cost).toBe(hotelbedsNetRate); // cost is preserved for audit, just never displayed
  });

  it("treats a non-finite or negative cost defensively as zero rather than propagating garbage", () => {
    expect(calculatePrice(-50, "EUR", []).sellingPrice).toBe(0);
    expect(calculatePrice(NaN, "EUR", []).sellingPrice).toBe(0);
  });
});
