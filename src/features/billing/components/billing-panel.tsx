"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  activateSubscriptionAction,
  cancelSubscriptionAction,
  changeSubscriptionPlanAction,
} from "@/features/billing/actions/billing.action";
import type { BillingSummary } from "@/features/billing/queries/get-billing-summary.query";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = {
  tenantId: string;
  summary: BillingSummary;
  /** True only for OWNER — billing:manage is OWNER-exclusive by design. */
  canManage: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  TRIALING: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
  EXPIRED: "Trial expired",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  TRIALING: "secondary",
  ACTIVE: "default",
  PAST_DUE: "outline",
  SUSPENDED: "destructive",
  CANCELLED: "destructive",
  EXPIRED: "destructive",
};

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function formatPrice(amount: number, currency: string, interval: "MONTH" | "YEAR" | null): string {
  if (amount === 0) return "Free";
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  return interval ? `${formatted} / ${interval === "MONTH" ? "mo" : "yr"}` : formatted;
}

export function BillingPanel({ tenantId, summary, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPlan, setSelectedPlan] = useState(summary.planCode);

  const needsReactivation =
    summary.effectiveStatus === "SUSPENDED" ||
    summary.effectiveStatus === "CANCELLED" ||
    summary.effectiveStatus === "EXPIRED";

  function activate(planCode: string) {
    startTransition(async () => {
      const result = await activateSubscriptionAction(tenantId, { planCode });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Subscription activated.");
      router.refresh();
    });
  }

  function changePlan(newPlanCode: string) {
    const newPlan = summary.availablePlans.find((p) => p.code === newPlanCode);
    const overSeatLimit = newPlan?.seatLimit != null && summary.seats.used > newPlan.seatLimit;
    const acknowledgeSeatOverage =
      overSeatLimit &&
      confirm(
        `This workspace uses ${summary.seats.used} seat(s), which is more than the ${newPlan!.name} plan's limit of ${newPlan!.seatLimit}. No seats will be removed automatically — proceed anyway?`,
      );
    if (overSeatLimit && !acknowledgeSeatOverage) return;

    startTransition(async () => {
      const result = await changeSubscriptionPlanAction(tenantId, { newPlanCode, acknowledgeSeatOverage });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Plan changed.");
      router.refresh();
    });
  }

  function cancel() {
    if (!confirm("Cancel this subscription? This cannot be undone from here.")) return;
    startTransition(async () => {
      const result = await cancelSubscriptionAction(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Subscription cancelled.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Plan</span>
            <Badge variant={STATUS_VARIANT[summary.effectiveStatus] ?? "outline"}>
              {STATUS_LABELS[summary.effectiveStatus] ?? summary.effectiveStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Current plan: <span className="font-medium">{summary.planName}</span>
          </p>
          {summary.effectiveStatus === "TRIALING" && summary.trialEndsAt && (
            <p className="text-muted-foreground">
              Trial ends in {Math.max(0, daysUntil(summary.trialEndsAt))} day(s) (
              {summary.trialEndsAt.toLocaleDateString()}).
            </p>
          )}
          {summary.effectiveStatus === "EXPIRED" && (
            <p className="text-destructive">
              The trial ended{" "}
              {summary.trialEndsAt ? summary.trialEndsAt.toLocaleDateString() : ""}. Activate a plan to
              restore access.
            </p>
          )}
          {summary.currentPeriodEnd && summary.effectiveStatus === "ACTIVE" && (
            <p className="text-muted-foreground">
              Renews {summary.currentPeriodEnd.toLocaleDateString()}.
            </p>
          )}
          {summary.effectiveStatus === "CANCELLED" && (
            <p className="text-destructive">This subscription is cancelled.</p>
          )}
          <p>
            Seats used:{" "}
            <span className="font-medium">
              {summary.seats.used} / {summary.seats.limit ?? "unlimited"}
            </span>
            {!summary.seats.withinLimit && (
              <span className="text-destructive"> — over limit</span>
            )}
          </p>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {needsReactivation ? "Reactivate" : "Change plan"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {summary.availablePlans.map((plan) => (
                  <SelectItem key={plan.code} value={plan.code}>
                    {plan.name} — {formatPrice(plan.priceAmount, plan.priceCurrency, plan.billingInterval)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={isPending || selectedPlan === summary.planCode}
              onClick={() => (needsReactivation ? activate(selectedPlan) : changePlan(selectedPlan))}
            >
              {needsReactivation ? "Activate" : "Change plan"}
            </Button>
            {!needsReactivation && summary.effectiveStatus !== "CANCELLED" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={cancel}
              >
                Cancel subscription
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
