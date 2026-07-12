import { allocateEvenly, sumAmounts } from "@/shared/lib/money";

/**
 * Pure installment-schedule builder. Given an invoice total, an optional
 * up-front deposit, and a count of follow-up installments, produce the
 * scheduled amounts + due dates. All splitting is cents-exact via
 * `allocateEvenly` — the schedule always sums precisely to the total, so a
 * customer who pays every installment owes exactly zero.
 *
 * The action layer persists the result as InstallmentPlan + Installment rows;
 * this module owns the math and is unit-tested in isolation.
 */

export type ScheduleInput = {
  /** The amount to schedule (normally the invoice's balance-carrying total). */
  total: number;
  /** Up-front deposit; 0 = no deposit installment. Must be < total. */
  depositAmount: number;
  /** Number of installments after the deposit (≥ 1). */
  installmentCount: number;
  /** Due date of the first scheduled amount (deposit if present). */
  firstDueDate: Date;
  /** Days between consecutive scheduled amounts. */
  intervalDays: number;
};

export type ScheduledInstallment = {
  /** 0 = deposit (when present); installments then count from 1. */
  sequence: number;
  label: string;
  dueDate: Date;
  amount: number;
};

export type ScheduleError =
  | "TOTAL_NOT_POSITIVE"
  | "DEPOSIT_NEGATIVE"
  | "DEPOSIT_NOT_BELOW_TOTAL"
  | "COUNT_NOT_POSITIVE"
  | "INTERVAL_NOT_POSITIVE";

export type ScheduleResult =
  | { ok: true; installments: ScheduledInstallment[] }
  | { ok: false; error: ScheduleError };

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function buildInstallmentSchedule(input: ScheduleInput): ScheduleResult {
  const { total, depositAmount, installmentCount, firstDueDate, intervalDays } = input;

  if (!(total > 0)) return { ok: false, error: "TOTAL_NOT_POSITIVE" };
  if (depositAmount < 0) return { ok: false, error: "DEPOSIT_NEGATIVE" };
  if (depositAmount >= total) return { ok: false, error: "DEPOSIT_NOT_BELOW_TOTAL" };
  if (!Number.isInteger(installmentCount) || installmentCount < 1) {
    return { ok: false, error: "COUNT_NOT_POSITIVE" };
  }
  if (!Number.isInteger(intervalDays) || intervalDays < 1) {
    return { ok: false, error: "INTERVAL_NOT_POSITIVE" };
  }

  const installments: ScheduledInstallment[] = [];
  let nextDue = firstDueDate;

  if (depositAmount > 0) {
    installments.push({
      sequence: 0,
      label: "Deposit",
      dueDate: nextDue,
      amount: sumAmounts([depositAmount]), // normalize to 2dp
    });
    nextDue = addDays(nextDue, intervalDays);
  }

  const remainder = sumAmounts([total, -depositAmount]);
  const amounts = allocateEvenly(remainder, installmentCount);
  amounts.forEach((amount, i) => {
    installments.push({
      sequence: i + 1,
      label:
        installmentCount === 1 && depositAmount > 0
          ? "Balance"
          : `Installment ${i + 1} of ${installmentCount}`,
      dueDate: addDays(nextDue, intervalDays * i),
      amount,
    });
  });

  return { ok: true, installments };
}

/** The scheduled amounts always sum back to the input total (cents-exact). */
export function scheduleTotal(installments: readonly ScheduledInstallment[]): number {
  return sumAmounts(installments.map((i) => i.amount));
}
