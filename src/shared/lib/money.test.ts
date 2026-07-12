import { describe, expect, it } from "vitest";

import {
  allocateEvenly,
  computeBalance,
  computeTotals,
  lineAmount,
  sumAmounts,
} from "@/shared/lib/money";

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

describe("computeBalance", () => {
  it("derives the outstanding position from total/paid/refunded/credited", () => {
    const b = computeBalance({ total: 1000, paid: 400, refunded: 100, credited: 200 });
    expect(b.netPaid).toBe(300); // 400 − 100
    expect(b.amountOwed).toBe(800); // 1000 − 200
    expect(b.balanceDue).toBe(500); // 800 − 300
    expect(b.settled).toBe(false);
  });

  it("marks the balance settled once the owed amount is fully collected", () => {
    const b = computeBalance({ total: 500, paid: 500, refunded: 0, credited: 0 });
    expect(b.balanceDue).toBe(0);
    expect(b.settled).toBe(true);
  });

  it("clamps at zero on overpayment and over-crediting", () => {
    const over = computeBalance({ total: 100, paid: 150, refunded: 0, credited: 0 });
    expect(over.balanceDue).toBe(0);
    const credited = computeBalance({ total: 100, paid: 0, refunded: 0, credited: 500 });
    expect(credited.amountOwed).toBe(0);
    expect(credited.balanceDue).toBe(0);
    expect(credited.settled).toBe(false); // nothing owed ≠ collected
  });

  it("never reports negative net paid when refunds exceed charges", () => {
    const b = computeBalance({ total: 100, paid: 50, refunded: 80, credited: 0 });
    expect(b.netPaid).toBe(0);
    expect(b.balanceDue).toBe(100);
  });

  it("uses integer-cents math (no float drift)", () => {
    const b = computeBalance({ total: 0.3, paid: 0.1, refunded: 0, credited: 0 });
    expect(b.balanceDue).toBe(0.2);
  });
});

describe("allocateEvenly", () => {
  it("splits an amount into parts that sum exactly to the input", () => {
    const parts = allocateEvenly(100, 3);
    expect(parts).toHaveLength(3);
    expect(sumAmounts(parts)).toBe(100);
    // 10000 cents / 3 = 3333 remainder 1 → first part gets the extra cent.
    expect(parts).toEqual([33.34, 33.33, 33.33]);
  });

  it("handles amounts that divide evenly", () => {
    expect(allocateEvenly(90, 3)).toEqual([30, 30, 30]);
  });

  it("distributes leftover cents one per leading part", () => {
    // 1.00 into 7 parts: 100 = 7*14 + 2 → two parts of 0.15, five of 0.14.
    const parts = allocateEvenly(1, 7);
    expect(parts).toEqual([0.15, 0.15, 0.14, 0.14, 0.14, 0.14, 0.14]);
    expect(sumAmounts(parts)).toBe(1);
  });

  it("clamps parts to at least one and amounts to non-negative", () => {
    expect(allocateEvenly(50, 0)).toEqual([50]);
    expect(allocateEvenly(-10, 2)).toEqual([0, 0]);
  });
});
