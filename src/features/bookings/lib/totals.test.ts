import { describe, it, expect } from "vitest";

import { computeTotals, lineAmount } from "@/features/bookings/lib/totals";

describe("lineAmount", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineAmount(3, 100)).toBe(300);
  });

  it("handles fractional prices without floating-point drift", () => {
    // 3 * 0.1 in float is 0.30000000000000004; cents math keeps it exact.
    expect(lineAmount(3, 0.1)).toBe(0.3);
  });

  it("truncates fractional quantities and floors negatives at zero", () => {
    expect(lineAmount(2.9, 10)).toBe(20);
    expect(lineAmount(-5, 10)).toBe(0);
  });
});

describe("computeTotals", () => {
  it("sums item amounts into the subtotal", () => {
    const totals = computeTotals({
      items: [
        { quantity: 2, unitPrice: 150 },
        { quantity: 1, unitPrice: 75.5 },
      ],
      discount: 0,
      tax: 0,
    });
    expect(totals.subtotal).toBe(375.5);
    expect(totals.total).toBe(375.5);
  });

  it("applies discount then tax", () => {
    const totals = computeTotals({
      items: [{ quantity: 1, unitPrice: 1000 }],
      discount: 100,
      tax: 90,
    });
    expect(totals.subtotal).toBe(1000);
    expect(totals.total).toBe(990); // 1000 - 100 + 90
  });

  it("never returns a negative total when discount exceeds subtotal", () => {
    const totals = computeTotals({
      items: [{ quantity: 1, unitPrice: 50 }],
      discount: 500,
      tax: 0,
    });
    expect(totals.total).toBe(0);
  });

  it("treats an empty booking as zero", () => {
    const totals = computeTotals({ items: [], discount: 0, tax: 0 });
    expect(totals).toEqual({ subtotal: 0, discount: 0, tax: 0, total: 0 });
  });

  it("clamps negative discount/tax inputs to zero", () => {
    const totals = computeTotals({
      items: [{ quantity: 1, unitPrice: 100 }],
      discount: -50,
      tax: -10,
    });
    expect(totals.discount).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(100);
  });
});
