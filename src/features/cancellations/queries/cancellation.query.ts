import "server-only";

import type { CancellationPenaltyType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";
import type { PolicyRule } from "@/features/cancellations/lib/cancellation-engine";

export type PolicyRuleView = PolicyRule & { id: string };

export type CancellationPolicyView = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  rules: PolicyRuleView[];
  bookingCount: number;
};

/** All live policies with their tiers, default first. */
export async function listCancellationPolicies(
  db: TenantDb,
): Promise<CancellationPolicyView[]> {
  const policies = await db.cancellationPolicy.findMany({
    where: { deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      rules: { orderBy: { daysBefore: "desc" } },
      _count: { select: { bookings: true } },
    },
  });

  return policies.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isDefault: p.isDefault,
    bookingCount: p._count.bookings,
    rules: p.rules.map((r) => ({
      id: r.id,
      daysBefore: r.daysBefore,
      penaltyType: r.penaltyType,
      penaltyValue: toNumber(r.penaltyValue) ?? 0,
    })),
  }));
}

export type BookingCancellationView = {
  id: string;
  policyId: string | null;
  policyName: string | null;
  cancelledAt: Date;
  daysBeforeTravel: number | null;
  penaltyType: CancellationPenaltyType;
  penaltyValue: number;
  penaltyAmount: number;
  supplierPenalty: number;
  amountPaid: number;
  refundDue: number;
  reason: string | null;
  notes: string | null;
};

/** The cancellation record for a booking, if it was cancelled. */
export async function getBookingCancellation(
  db: TenantDb,
  tenantId: string,
  bookingId: string,
): Promise<BookingCancellationView | null> {
  const record = await db.bookingCancellation.findFirst({
    where: { bookingId, tenantId },
    include: { policy: { select: { name: true } } },
  });
  if (!record) return null;

  return {
    id: record.id,
    policyId: record.policyId,
    policyName: record.policy?.name ?? null,
    cancelledAt: record.cancelledAt,
    daysBeforeTravel: record.daysBeforeTravel,
    penaltyType: record.penaltyType,
    penaltyValue: toNumber(record.penaltyValue) ?? 0,
    penaltyAmount: toNumber(record.penaltyAmount) ?? 0,
    supplierPenalty: toNumber(record.supplierPenalty) ?? 0,
    amountPaid: toNumber(record.amountPaid) ?? 0,
    refundDue: toNumber(record.refundDue) ?? 0,
    reason: record.reason,
    notes: record.notes,
  };
}
