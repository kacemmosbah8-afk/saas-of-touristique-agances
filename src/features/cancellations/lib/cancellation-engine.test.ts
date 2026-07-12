import { describe, expect, it } from "vitest";

import {
  computeCancellationOutcome,
  daysBetween,
  resolveRule,
  type PolicyRule,
} from "@/features/cancellations/lib/cancellation-engine";

// A typical tiered policy: free ≥ 30 days out, 25% at 15–29 days,
// 50% at 7–14 days, 100% under 7 days.
const RULES: PolicyRule[] = [
  { daysBefore: 30, penaltyType: "NONE", penaltyValue: 0 },
  { daysBefore: 15, penaltyType: "PERCENTAGE", penaltyValue: 25 },
  { daysBefore: 7, penaltyType: "PERCENTAGE", penaltyValue: 50 },
  { daysBefore: 0, penaltyType: "PERCENTAGE", penaltyValue: 100 },
];

describe("resolveRule", () => {
  it("picks the highest matching threshold", () => {
    expect(resolveRule(RULES, 45)?.daysBefore).toBe(30);
    expect(resolveRule(RULES, 30)?.daysBefore).toBe(30);
    expect(resolveRule(RULES, 20)?.daysBefore).toBe(15);
    expect(resolveRule(RULES, 7)?.daysBefore).toBe(7);
    expect(resolveRule(RULES, 2)?.daysBefore).toBe(0);
  });

  it("uses the catch-all when no travel date is known", () => {
    expect(resolveRule(RULES, null)?.daysBefore).toBe(0);
  });

  it("returns null when no rule matches and no catch-all exists", () => {
    expect(resolveRule([{ daysBefore: 30, penaltyType: "NONE", penaltyValue: 0 }], 5)).toBeNull();
  });
});

describe("computeCancellationOutcome", () => {
  it("charges nothing inside the free window and refunds everything paid", () => {
    const o = computeCancellationOutcome({
      total: 1000,
      netPaid: 400,
      daysBeforeTravel: 45,
      rules: RULES,
    });
    expect(o.policyPenalty).toBe(0);
    expect(o.totalPenalty).toBe(0);
    expect(o.refundDue).toBe(400);
    expect(o.outstandingPenalty).toBe(0);
  });

  it("applies a percentage penalty of the booking total", () => {
    const o = computeCancellationOutcome({
      total: 1000,
      netPaid: 1000,
      daysBeforeTravel: 20,
      rules: RULES,
    });
    expect(o.policyPenalty).toBe(250);
    expect(o.refundDue).toBe(750);
  });

  it("reports an outstanding penalty when the customer paid less than it", () => {
    const o = computeCancellationOutcome({
      total: 1000,
      netPaid: 100,
      daysBeforeTravel: 10, // 50% tier → 500 penalty
      rules: RULES,
    });
    expect(o.totalPenalty).toBe(500);
    expect(o.refundDue).toBe(0);
    expect(o.outstandingPenalty).toBe(400);
  });

  it("adds the supplier penalty and caps the total at the booking value", () => {
    const o = computeCancellationOutcome({
      total: 1000,
      netPaid: 1000,
      daysBeforeTravel: 2, // 100% tier
      rules: RULES,
      supplierPenalty: 300,
    });
    // 1000 + 300 capped at the 1000 booking total.
    expect(o.totalPenalty).toBe(1000);
    expect(o.refundDue).toBe(0);
  });

  it("supports fixed penalties and clamps them at the total", () => {
    const fixed: PolicyRule[] = [{ daysBefore: 0, penaltyType: "FIXED", penaltyValue: 150 }];
    const o = computeCancellationOutcome({
      total: 100, // fixed 150 exceeds the total
      netPaid: 100,
      daysBeforeTravel: 5,
      rules: fixed,
    });
    expect(o.policyPenalty).toBe(100);
    expect(o.refundDue).toBe(0);
  });

  it("uses integer-cents math on awkward percentages", () => {
    const o = computeCancellationOutcome({
      total: 99.99,
      netPaid: 99.99,
      daysBeforeTravel: 20, // 25%
      rules: RULES,
    });
    expect(o.policyPenalty).toBe(25);
    expect(o.refundDue).toBe(74.99);
  });

  it("charges nothing when no rule matches", () => {
    const o = computeCancellationOutcome({
      total: 500,
      netPaid: 200,
      daysBeforeTravel: 5,
      rules: [{ daysBefore: 30, penaltyType: "PERCENTAGE", penaltyValue: 10 }],
    });
    expect(o.rule).toBeNull();
    expect(o.totalPenalty).toBe(0);
    expect(o.refundDue).toBe(200);
  });
});

describe("daysBetween", () => {
  it("floors to whole days and never goes negative", () => {
    expect(daysBetween(new Date("2026-07-12"), new Date("2026-08-11"))).toBe(30);
    expect(daysBetween(new Date("2026-07-12T00:00:00Z"), new Date("2026-07-13T23:00:00Z"))).toBe(1);
    expect(daysBetween(new Date("2026-08-01"), new Date("2026-07-12"))).toBe(0);
  });
});
