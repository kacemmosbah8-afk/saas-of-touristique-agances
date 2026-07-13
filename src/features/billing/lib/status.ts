import type { BillingInterval, SubscriptionStatus, TenantPlan, TenantStatus } from "@prisma/client";

/**
 * Subscription lifecycle transition rules. Pure and side-effect free — the
 * same discipline as `bookings/lib/status.ts` and
 * `supplier-execution/lib/status.ts`.
 *
 *   TRIALING ──▶ ACTIVE ──▶ PAST_DUE ──▶ SUSPENDED
 *      │            │           │            │
 *      │            └───────────┴────────────┴──▶ CANCELLED (terminal)
 *      ▼
 *   EXPIRED ──▶ ACTIVE            (a lapsed trial can still convert later)
 *      │
 *      └──▶ CANCELLED
 *
 * PAST_DUE and the failed-renewal event that produces it only exist once a
 * real payment provider is integrated (not this sprint) — the state is
 * modeled so that integration doesn't require a lifecycle redesign, exactly
 * how AWAITING_PAYMENT existed in the Supplier Execution lifecycle before a
 * "pay for a hold order" call was built.
 */
const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  TRIALING: ["ACTIVE", "EXPIRED", "CANCELLED"],
  ACTIVE: ["PAST_DUE", "CANCELLED"],
  PAST_DUE: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "CANCELLED"],
  CANCELLED: [],
  EXPIRED: ["ACTIVE", "CANCELLED"],
};

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: SubscriptionStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/**
 * A trial's expiry is derived from `trialEndsAt`, never a background job
 * flipping the stored status — the same pattern `isOverdue()` already uses
 * for invoices (`features/invoices/lib/invoice-status.ts`). Any enforcement
 * point (permission check, entitlement check) calls this to get the real
 * current state without a cron having run.
 */
export function isTrialExpired(trialEndsAt: Date | null, now: Date = new Date()): boolean {
  if (!trialEndsAt) return false;
  return trialEndsAt.getTime() <= now.getTime();
}

export function isGracePeriodExpired(
  gracePeriodEndsAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (!gracePeriodEndsAt) return false;
  return gracePeriodEndsAt.getTime() <= now.getTime();
}

/**
 * The status to treat a subscription as *right now*, accounting for
 * time-based expiry the stored `status` column may not reflect yet (see
 * `isTrialExpired` above). This is what every enforcement point should
 * call — never read `subscription.status` directly for an access decision.
 */
export function effectiveStatus(
  subscription: { status: SubscriptionStatus; trialEndsAt: Date | null; gracePeriodEndsAt: Date | null },
  now: Date = new Date(),
): SubscriptionStatus {
  if (subscription.status === "TRIALING" && isTrialExpired(subscription.trialEndsAt, now)) {
    return "EXPIRED";
  }
  if (subscription.status === "PAST_DUE" && isGracePeriodExpired(subscription.gracePeriodEndsAt, now)) {
    return "SUSPENDED";
  }
  return subscription.status;
}

/** Whether the tenant should currently have working access to the product. */
export function grantsAccess(status: SubscriptionStatus): boolean {
  return status === "TRIALING" || status === "ACTIVE" || status === "PAST_DUE";
}

/**
 * The coarse `Tenant.status` projection for a given effective subscription
 * status — kept in sync by every write path, never computed inline at
 * call sites (a second copy of this mapping is exactly the kind of
 * duplication this session has repeatedly caught in self-review).
 */
export function tenantStatusFor(status: SubscriptionStatus): TenantStatus {
  if (grantsAccess(status)) return "ACTIVE";
  if (status === "SUSPENDED") return "SUSPENDED";
  return "CANCELLED";
}

const PLAN_CODE_TO_TENANT_PLAN: Record<string, TenantPlan> = {
  trial: "TRIAL",
  starter: "STARTER",
  professional: "PROFESSIONAL",
  enterprise: "ENTERPRISE",
};

/**
 * Maps a `Plan.code` (the catalog's own identifier) to the coarse
 * `Tenant.plan` projection. Throws on an unrecognized code rather than
 * silently defaulting — every caller already has a real `Plan` row in hand
 * by the time this runs, so an unknown code means the catalog and this map
 * have drifted, which should fail loudly, not default to TRIAL.
 */
export function tenantPlanFor(planCode: string): TenantPlan {
  const mapped = PLAN_CODE_TO_TENANT_PLAN[planCode];
  if (!mapped) throw new Error(`Unknown plan code: ${planCode}`);
  return mapped;
}

export const TRIAL_LENGTH_DAYS = 14;

/** Pure — the trial end date for a subscription starting `from` (default now). */
export function trialEndsAtFrom(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + TRIAL_LENGTH_DAYS);
  return end;
}

/**
 * Pure — the next `currentPeriodEnd` for a plan with `interval`, starting
 * `from` (default now). Null for a plan with no billing interval (the
 * trial plan): a trial has no billing period, only `trialEndsAt`.
 */
export function periodEndFor(interval: BillingInterval | null, from: Date = new Date()): Date | null {
  if (!interval) return null;
  const end = new Date(from);
  if (interval === "MONTH") end.setMonth(end.getMonth() + 1);
  else end.setFullYear(end.getFullYear() + 1);
  return end;
}
