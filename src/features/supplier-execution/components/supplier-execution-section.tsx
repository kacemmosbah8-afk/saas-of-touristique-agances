"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plane, RotateCw, XCircle, RefreshCw } from "lucide-react";

import {
  requestExecutionAction,
  retryExecutionAction,
  cancelExecutionAction,
  checkSupplierOrderStatusAction,
} from "@/features/supplier-execution/actions/execution.action";
import type { SupplierOrderView } from "@/features/supplier-execution/queries/list-supplier-orders.query";
import { SUPPLIER_ORDER_STATUS_LABELS } from "@/features/supplier-execution/lib/status";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";
import type { StatusTone } from "@/shared/lib/status-tone";
import { cn } from "@/shared/lib/utils";

type Props = {
  tenantId: string;
  bookingId: string;
  orders: SupplierOrderView[];
  editable: boolean;
  canManage: boolean;
};

const STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "neutral",
  EXECUTING: "warning",
  SUPPLIER_CONFIRMED: "success",
  SUPPLIER_FAILED: "danger",
  AWAITING_PAYMENT: "warning",
  AWAITING_SUPPLIER_CONFIRMATION: "warning",
  CANCELLED: "neutral",
  RECONCILIATION_REQUIRED: "danger",
};

/**
 * Real supplier order execution — this is the one section in TravelOS that
 * can spend real money (an agency's own pre-funded supplier balance for an
 * instant-purchase or Hotelbeds order; a Duffel HOLD order moves nothing
 * until paid separately). See PROJECT.md, "Supplier Order Execution
 * Capability" for the full lifecycle and the paid-booking precondition
 * `overridePayment` bypasses.
 */
export function SupplierExecutionSection({ tenantId, bookingId, orders, editable, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isChecking, startCheck] = useTransition();
  const [confirmingItemId, setConfirmingItemId] = useState<string | null>(null);
  const [checkingItemId, setCheckingItemId] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(success);
      setConfirmingItemId(null);
      router.refresh();
    });
  }

  function checkNow(bookingItemId: string) {
    setCheckingItemId(bookingItemId);
    startCheck(async () => {
      const result = await checkSupplierOrderStatusAction(tenantId, bookingId, bookingItemId);
      setCheckingItemId(null);
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(
        result.data.status === "AWAITING_SUPPLIER_CONFIRMATION"
          ? "Still awaiting supplier confirmation."
          : "Status updated.",
      );
      router.refresh();
    });
  }

  function fmt(date: Date | null): string {
    return date ? new Date(date).toLocaleString() : "";
  }

  function execute(bookingItemId: string, overridePayment: boolean) {
    run(
      () => requestExecutionAction(tenantId, bookingId, bookingItemId, { overridePayment }),
      "Execution requested.",
    );
  }

  if (orders.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed py-4 text-center text-xs">
        No flight or hotel lines from a live supplier search on this booking yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <li key={order.bookingItemId} className="rounded-lg border px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{order.itemDescription}</p>
              <p className="text-muted-foreground text-xs">
                {order.paymentMode === "HOLD" ? "Hold (no payment yet)" : "Instant purchase"}
                {order.confirmationNumber ? ` · #${order.confirmationNumber}` : ""}
                {order.attempts > 0 ? ` · ${order.attempts} attempt(s)` : ""}
              </p>
              {order.status === "AWAITING_SUPPLIER_CONFIRMATION" && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Requested {fmt(order.requestedAt)}
                  {order.lastCheckedAt ? ` · last checked ${fmt(order.lastCheckedAt)}` : " · not checked yet"}
                </p>
              )}
              {order.status === "SUPPLIER_CONFIRMED" && order.confirmedAt && (
                <p className="text-muted-foreground mt-1 text-xs">Confirmed {fmt(order.confirmedAt)}</p>
              )}
              {order.status === "CANCELLED" && order.cancelledAt && (
                <p className="text-muted-foreground mt-1 text-xs">Cancelled {fmt(order.cancelledAt)}</p>
              )}
              {order.lastError && (order.status === "SUPPLIER_FAILED" || order.status === "RECONCILIATION_REQUIRED") && (
                <p className="text-destructive mt-1 text-xs">{order.lastError}</p>
              )}
              {order.paidOverride && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Executed against an unpaid booking (manager override).
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge tone={STATUS_TONE[order.status] ?? "neutral"}>
                {SUPPLIER_ORDER_STATUS_LABELS[order.status]}
              </StatusBadge>

              {editable && order.status === "PENDING" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={isPending}
                  onClick={() => {
                    if (confirmingItemId === order.bookingItemId) execute(order.bookingItemId, false);
                    else setConfirmingItemId(order.bookingItemId);
                  }}
                >
                  <Plane className="mr-1 size-3" />
                  {confirmingItemId === order.bookingItemId ? "Confirm — place real order" : "Execute"}
                </Button>
              )}

              {editable && order.status === "AWAITING_SUPPLIER_CONFIRMATION" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={isChecking}
                  onClick={() => checkNow(order.bookingItemId)}
                >
                  <RefreshCw className={cn("mr-1 size-3", checkingItemId === order.bookingItemId && "animate-spin")} />
                  {checkingItemId === order.bookingItemId ? "Checking…" : "Check now"}
                </Button>
              )}

              {editable && order.status === "SUPPLIER_FAILED" && order.retryable && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={isPending}
                  onClick={() => run(() => retryExecutionAction(tenantId, bookingId, order.bookingItemId), "Retry requested.")}
                >
                  <RotateCw className="mr-1 size-3" />
                  Retry
                </Button>
              )}

              {canManage &&
                (order.status === "SUPPLIER_CONFIRMED" ||
                  order.status === "AWAITING_PAYMENT" ||
                  order.status === "AWAITING_SUPPLIER_CONFIRMATION") && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                  disabled={isPending}
                  onClick={() => run(() => cancelExecutionAction(tenantId, bookingId, order.bookingItemId), "Order cancelled.")}
                >
                  <XCircle className="mr-1 size-3" />
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {confirmingItemId === order.bookingItemId && order.status === "PENDING" && (
            <p className="text-muted-foreground mt-2 border-t pt-2 text-xs">
              This places a real order with the supplier
              {order.paymentMode === "BALANCE"
                ? " and debits your agency's supplier balance immediately."
                : " as a hold — no payment moves until it's paid separately."}{" "}
              Click &ldquo;Confirm&rdquo; again to proceed, or{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setConfirmingItemId(null)}
              >
                cancel
              </button>
              .
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
