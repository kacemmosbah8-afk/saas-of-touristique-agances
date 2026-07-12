import type { CancellationPenaltyType } from "@prisma/client";

import { sumAmounts } from "@/shared/lib/money";

/**
 * The pure cancellation engine. Given a policy's tiers, when the cancellation
 * happens relative to travel, what the booking is worth, and what has been
 * collected, it derives the penalty retained and the refund owed — all in
 * integer-cents-safe arithmetic via the shared money module. The action layer
 * persists the outcome as a BookingCancellation; the actual money moves
 * through the Sprint-3 payment refund flow.
 */

export type PolicyRule = {
  /** Applies when cancelling at least this many days before travel start. */
  daysBefore: number;
  penaltyType: CancellationPenaltyType;
  /** Percent 0–100 for PERCENTAGE, an amount for FIXED, ignored for NONE. */
  penaltyValue: number;
};

export type CancellationInput = {
  /** The booking's total (what the penalty percentage applies to). */
  total: number;
  /** Net collected across the booking's invoices (paid − refunded). */
  netPaid: number;
  /** Days between cancellation and travel start; null = no travel date. */
  daysBeforeTravel: number | null;
  rules: readonly PolicyRule[];
  /** Penalty the supplier charges the agency, passed on to the customer. */
  supplierPenalty?: number;
};

export type CancellationOutcome = {
  /** The tier that applied, or null when the policy has no rules. */
  rule: PolicyRule | null;
  /** Penalty from the policy tier alone (before the supplier's). */
  policyPenalty: number;
  supplierPenalty: number;
  /** policyPenalty + supplierPenalty, capped at the booking total. */
  totalPenalty: number;
  /** max(0, netPaid − totalPenalty): what the customer gets back. */
  refundDue: number;
  /** max(0, totalPenalty − netPaid): what the customer still owes. */
  outstandingPenalty: number;
};

/**
 * Pick the tier that applies: the matching rule with the *highest*
 * `daysBefore` threshold ≤ the actual lead time wins... more precisely,
 * rules are sorted by `daysBefore` descending and the first rule whose
 * threshold the lead time meets (daysBeforeTravel ≥ daysBefore) applies.
 * A null lead time (no travel date) falls through to the catch-all
 * (`daysBefore: 0`) — the strictest assumption is not justified without a
 * date, the fallback tier is. Returns null when no rule matches (e.g. no
 * catch-all configured and the lead time is below every threshold).
 */
export function resolveRule(
  rules: readonly PolicyRule[],
  daysBeforeTravel: number | null,
): PolicyRule | null {
  const sorted = [...rules].sort((a, b) => b.daysBefore - a.daysBefore);
  const lead = daysBeforeTravel ?? 0;
  for (const rule of sorted) {
    if (lead >= rule.daysBefore) return rule;
  }
  return null;
}

function penaltyFor(rule: PolicyRule | null, total: number): number {
  if (!rule) return 0;
  switch (rule.penaltyType) {
    case "NONE":
      return 0;
    case "PERCENTAGE": {
      const percent = Math.min(100, Math.max(0, rule.penaltyValue));
      // Integer-cents: percentage of the total, rounded to cents.
      return Math.round(total * 100 * (percent / 100)) / 100;
    }
    case "FIXED":
      return Math.max(0, rule.penaltyValue);
  }
}

export function computeCancellationOutcome(input: CancellationInput): CancellationOutcome {
  const { total, netPaid, daysBeforeTravel, rules } = input;
  const supplierPenalty = Math.max(0, input.supplierPenalty ?? 0);

  const rule = resolveRule(rules, daysBeforeTravel);
  const policyPenalty = Math.min(Math.max(0, total), penaltyFor(rule, total));
  const totalPenalty = Math.min(
    Math.max(0, total),
    sumAmounts([policyPenalty, supplierPenalty]),
  );

  const refundDue = Math.max(0, sumAmounts([netPaid, -totalPenalty]));
  const outstandingPenalty = Math.max(0, sumAmounts([totalPenalty, -netPaid]));

  return { rule, policyPenalty, supplierPenalty, totalPenalty, refundDue, outstandingPenalty };
}

/** Whole days between two instants, floored at zero (cancelling after
 * departure counts as zero lead time, not negative). */
export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}
