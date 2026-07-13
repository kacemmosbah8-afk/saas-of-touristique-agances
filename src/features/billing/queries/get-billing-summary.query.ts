import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { effectiveStatus } from "@/features/billing/lib/status";
import { checkSeatLimit, type SeatLimitResult } from "@/features/billing/lib/entitlements";

export type PlanOption = {
  code: string;
  name: string;
  seatLimit: number | null;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: "MONTH" | "YEAR" | null;
  features: string[];
};

export type BillingSummary = {
  planCode: string;
  planName: string;
  status: string;
  effectiveStatus: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
  cancelledAt: Date | null;
  seats: SeatLimitResult;
  availablePlans: PlanOption[];
};

/**
 * Everything the Settings "Billing" tab needs in one round trip: the
 * tenant's current subscription state (using `effectiveStatus`, never the
 * raw stored status, so a lapsed trial reads as expired even before any
 * write has caught up), seat usage, and the plan catalog for the
 * change-plan control.
 */
export async function getBillingSummary(db: TenantDb, tenantId: string): Promise<BillingSummary | null> {
  const [subscription, seats, plans] = await Promise.all([
    db.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    }),
    checkSeatLimit(db, tenantId),
    db.plan.findMany({
      where: { active: true },
      orderBy: { priceAmount: "asc" },
      select: {
        code: true,
        name: true,
        seatLimit: true,
        priceAmount: true,
        priceCurrency: true,
        billingInterval: true,
        features: true,
      },
    }),
  ]);

  if (!subscription) return null;

  return {
    planCode: subscription.plan.code,
    planName: subscription.plan.name,
    status: subscription.status,
    effectiveStatus: effectiveStatus(subscription),
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    gracePeriodEndsAt: subscription.gracePeriodEndsAt,
    cancelledAt: subscription.cancelledAt,
    seats,
    availablePlans: plans.map((p) => ({
      ...p,
      priceAmount: Number(p.priceAmount),
    })),
  };
}
