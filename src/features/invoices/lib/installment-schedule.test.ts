import { describe, expect, it } from "vitest";

import {
  buildInstallmentSchedule,
  scheduleTotal,
} from "@/features/invoices/lib/installment-schedule";

const firstDue = new Date("2026-08-01T00:00:00Z");

describe("buildInstallmentSchedule", () => {
  it("splits a total evenly across installments, cents-exact", () => {
    const result = buildInstallmentSchedule({
      total: 1000,
      depositAmount: 0,
      installmentCount: 3,
      firstDueDate: firstDue,
      intervalDays: 30,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.installments).toHaveLength(3);
    // 100000 cents / 3 → 333.34 + 333.33 + 333.33
    expect(result.installments.map((i) => i.amount)).toEqual([333.34, 333.33, 333.33]);
    expect(scheduleTotal(result.installments)).toBe(1000);
  });

  it("puts the deposit first (sequence 0) and splits the remainder", () => {
    const result = buildInstallmentSchedule({
      total: 1000,
      depositAmount: 250,
      installmentCount: 2,
      firstDueDate: firstDue,
      intervalDays: 15,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.installments).toHaveLength(3);
    expect(result.installments[0]).toMatchObject({
      sequence: 0,
      label: "Deposit",
      amount: 250,
    });
    expect(result.installments[1].amount).toBe(375);
    expect(result.installments[2].amount).toBe(375);
    expect(scheduleTotal(result.installments)).toBe(1000);
  });

  it("spaces due dates by the interval, starting at the first due date", () => {
    const result = buildInstallmentSchedule({
      total: 300,
      depositAmount: 100,
      installmentCount: 2,
      firstDueDate: firstDue,
      intervalDays: 10,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const dates = result.installments.map((i) => i.dueDate.toISOString().slice(0, 10));
    expect(dates).toEqual(["2026-08-01", "2026-08-11", "2026-08-21"]);
  });

  it("survives awkward cents without drift", () => {
    const result = buildInstallmentSchedule({
      total: 0.1,
      depositAmount: 0,
      installmentCount: 3,
      firstDueDate: firstDue,
      intervalDays: 7,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.installments.map((i) => i.amount)).toEqual([0.04, 0.03, 0.03]);
    expect(scheduleTotal(result.installments)).toBe(0.1);
  });

  it("labels a single post-deposit installment as the balance", () => {
    const result = buildInstallmentSchedule({
      total: 500,
      depositAmount: 200,
      installmentCount: 1,
      firstDueDate: firstDue,
      intervalDays: 30,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.installments[1].label).toBe("Balance");
    expect(result.installments[1].amount).toBe(300);
  });

  it("rejects invalid inputs with typed errors", () => {
    const base = {
      total: 100,
      depositAmount: 0,
      installmentCount: 2,
      firstDueDate: firstDue,
      intervalDays: 30,
    };
    expect(buildInstallmentSchedule({ ...base, total: 0 })).toEqual({
      ok: false,
      error: "TOTAL_NOT_POSITIVE",
    });
    expect(buildInstallmentSchedule({ ...base, depositAmount: -1 })).toEqual({
      ok: false,
      error: "DEPOSIT_NEGATIVE",
    });
    expect(buildInstallmentSchedule({ ...base, depositAmount: 100 })).toEqual({
      ok: false,
      error: "DEPOSIT_NOT_BELOW_TOTAL",
    });
    expect(buildInstallmentSchedule({ ...base, installmentCount: 0 })).toEqual({
      ok: false,
      error: "COUNT_NOT_POSITIVE",
    });
    expect(buildInstallmentSchedule({ ...base, intervalDays: 0 })).toEqual({
      ok: false,
      error: "INTERVAL_NOT_POSITIVE",
    });
  });
});
