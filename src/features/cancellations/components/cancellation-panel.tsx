"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BookingStatus } from "@prisma/client";

import { assignCancellationPolicyAction } from "@/features/cancellations/actions/cancellation-policy.action";
import {
  computeCancellationOutcome,
  daysBetween,
} from "@/features/cancellations/lib/cancellation-engine";
import type {
  CancellationPolicyView,
  BookingCancellationView,
} from "@/features/cancellations/queries/cancellation.query";
import { PENALTY_TYPE_LABELS } from "@/features/cancellations/schemas/cancellation.schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const NONE = "__none__";

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

type Props = {
  tenantId: string;
  bookingId: string;
  bookingStatus: BookingStatus;
  bookingTotal: number;
  netPaid: number;
  currency: string;
  travelStartDate: Date | null;
  policyId: string | null;
  policies: CancellationPolicyView[];
  /** Written record once the booking is cancelled. */
  record: BookingCancellationView | null;
  canEdit: boolean;
};

/**
 * The booking's cancellation posture: assign a policy while the booking is
 * open (with a live what-if preview computed by the same pure engine the
 * cancel action runs), and show the immutable outcome record once cancelled.
 */
export function CancellationPanel({
  tenantId,
  bookingId,
  bookingStatus,
  bookingTotal,
  netPaid,
  currency,
  travelStartDate,
  policyId,
  policies,
  record,
  canEdit,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activePolicy = policies.find((p) => p.id === policyId) ?? null;

  // What-if preview: cancelling right now under the assigned policy.
  const preview = useMemo(() => {
    if (!activePolicy || bookingStatus === "CANCELLED") return null;
    const daysBeforeTravel = travelStartDate
      ? daysBetween(new Date(), new Date(travelStartDate))
      : null;
    return {
      daysBeforeTravel,
      outcome: computeCancellationOutcome({
        total: bookingTotal,
        netPaid,
        daysBeforeTravel,
        rules: activePolicy.rules,
      }),
    };
  }, [activePolicy, bookingStatus, bookingTotal, netPaid, travelStartDate]);

  function assign(next: string) {
    startTransition(async () => {
      const result = await assignCancellationPolicyAction(tenantId, bookingId, {
        policyId: next === NONE ? "" : next,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cancellation policy updated.");
      router.refresh();
    });
  }

  if (record) {
    return (
      <dl className="space-y-1.5 text-sm">
        {record.policyName && <Row label="Policy" value={record.policyName} />}
        {record.daysBeforeTravel != null && (
          <Row label="Cancelled" value={`${record.daysBeforeTravel} days before travel`} />
        )}
        <Row
          label="Policy penalty"
          value={`${money(record.penaltyAmount, currency)}${
            record.penaltyType === "PERCENTAGE" ? ` (${record.penaltyValue}%)` : ""
          }`}
        />
        {record.supplierPenalty > 0 && (
          <Row label="Supplier penalty" value={money(record.supplierPenalty, currency)} />
        )}
        <Row label="Paid at cancellation" value={money(record.amountPaid, currency)} />
        <div className="border-t pt-1.5">
          <Row label="Refund due" value={money(record.refundDue, currency)} strong />
        </div>
        <p className="text-muted-foreground pt-1 text-xs">
          Process the refund from the booking&apos;s invoice (Payments → Refund).
        </p>
      </dl>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {canEdit && bookingStatus !== "CANCELLED" ? (
        <div>
          <p className="text-muted-foreground mb-1 text-xs">Policy</p>
          <Select value={policyId ?? NONE} onValueChange={assign} disabled={isPending}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No policy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No policy</SelectItem>
              {policies.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.isDefault ? " (default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <Row label="Policy" value={activePolicy?.name ?? "None"} />
      )}

      {activePolicy && (
        <ul className="text-muted-foreground space-y-0.5 text-xs">
          {activePolicy.rules.map((r) => (
            <li key={r.id}>
              ≥ {r.daysBefore}d before travel:{" "}
              {r.penaltyType === "NONE"
                ? "free cancellation"
                : r.penaltyType === "PERCENTAGE"
                  ? `${r.penaltyValue}% of total`
                  : `${money(r.penaltyValue, currency)} ${PENALTY_TYPE_LABELS.FIXED.toLowerCase()}`}
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <div className="rounded-lg border border-dashed p-2.5">
          <p className="text-muted-foreground mb-1 text-xs">
            If cancelled today
            {preview.daysBeforeTravel != null
              ? ` (${preview.daysBeforeTravel} days before travel)`
              : ""}
            :
          </p>
          <dl className="space-y-1 text-xs">
            <Row label="Penalty" value={money(preview.outcome.totalPenalty, currency)} />
            <Row label="Refund due" value={money(preview.outcome.refundDue, currency)} strong />
            {preview.outcome.outstandingPenalty > 0 && (
              <Row
                label="Still owed by customer"
                value={money(preview.outcome.outstandingPenalty, currency)}
              />
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
