import { describe, expect, it } from "vitest";

import { computeTotals, lineAmount, sumAmounts } from "@/shared/lib/money";

describe("lineAmount", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineAmount(3, 10)).toBe(30);
  });

  it("uses integer-cents math (no float drift)", () => {
    // 0.1 * 3 in float is 0.30000000000000004; cents math yields exactly 0.3.
    expect(lineAmount(3, 0.1)).toBe(0.3);
  });

  it("floors fractional quantities and never goes negative", () => {
    expect(lineAmount(2.9, 10)).toBe(20);
    expect(lineAmount(-5, 10)).toBe(0);
  });
});

describe("computeTotals", () => {
  it("sums line amounts into the subtotal and applies discount/tax", () => {
    const totals = computeTotals({
      items: [
        { quantity: 2, unitPrice: 100 },
        { quantity: 1, unitPrice: 50 },
      ],
      discount: 25,
      tax: 15,
    });
    expect(totals.subtotal).toBe(250);
    expect(totals.discount).toBe(25);
    expect(totals.tax).toBe(15);
    expect(totals.total).toBe(240);
  });

  it("clamps the total at zero when the discount exceeds the subtotal", () => {
    const totals = computeTotals({
      items: [{ quantity: 1, unitPrice: 100 }],
      discount: 500,
      tax: 0,
    });
    expect(totals.total).toBe(0);
  });

  it("clamps negative discount/tax to zero", () => {
    const totals = computeTotals({
      items: [{ quantity: 1, unitPrice: 100 }],
      discount: -50,
      tax: -10,
    });
    expect(totals.discount).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(100);
  });

  it("returns a zero subtotal for an empty line set", () => {
    const totals = computeTotals({ items: [], discount: 0, tax: 20 });
    expect(totals.subtotal).toBe(0);
    expect(totals.total).toBe(20);
  });
});

describe("sumAmounts", () => {
  it("sums 2-dp amounts without float drift", () => {
    // 0.1 + 0.2 in float is 0.30000000000000004.
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
  });

  it("supports negative values for net calculations", () => {
    expect(sumAmounts([100, -30.5])).toBe(69.5);
  });

  it("returns zero for an empty list", () => {
    expect(sumAmounts([])).toBe(0);
  });
});
