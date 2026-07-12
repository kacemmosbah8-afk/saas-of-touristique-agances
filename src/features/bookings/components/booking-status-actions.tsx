"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BookingStatus } from "@prisma/client";

import {
  updateBookingStatusAction,
  cancelBookingAction,
  assignBookingAction,
} from "@/features/bookings/actions/booking.action";
import { nextStatuses, BOOKING_STATUS_LABELS } from "@/features/bookings/lib/status";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

const NONE = "__none__";

type Props = {
  tenantId: string;
  bookingId: string;
  status: BookingStatus;
  ownerId: string | null;
  members: MemberOption[];
  canEdit: boolean;
};

export function BookingStatusActions({
  tenantId,
  bookingId,
  status,
  ownerId,
  members,
  canEdit,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [supplierPenalty, setSupplierPenalty] = useState(0);

  // CANCELLED is offered through the dedicated cancel flow, not as a plain button.
  const transitions = nextStatuses(status).filter((s) => s !== "CANCELLED");
  const canCancel = nextStatuses(status).includes("CANCELLED");

  function moveTo(target: BookingStatus) {
    startTransition(async () => {
      const result = await updateBookingStatusAction(tenantId, bookingId, { status: target });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Booking marked ${BOOKING_STATUS_LABELS[target].toLowerCase()}.`);
      router.refresh();
    });
  }

  function confirmCancel() {
    startTransition(async () => {
      const result = await cancelBookingAction(tenantId, bookingId, {
        reason,
        supplierPenalty,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Booking cancelled.");
      setCancelling(false);
      setReason("");
      setSupplierPenalty(0);
      router.refresh();
    });
  }

  function assign(next: string) {
    startTransition(async () => {
      const result = await assignBookingAction(tenantId, bookingId, {
        ownerId: next === NONE ? "" : next,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Agent updated.");
      router.refresh();
    });
  }

  if (!canEdit) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {transitions.map((target) => (
          <Button key={target} size="sm" disabled={isPending} onClick={() => moveTo(target)}>
            Mark {BOOKING_STATUS_LABELS[target].toLowerCase()}
          </Button>
        ))}
        {canCancel && !cancelling && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setCancelling(true)}
            className="text-red-600 hover:text-red-700"
          >
            Cancel booking
          </Button>
        )}
      </div>

      {cancelling && (
        <div className="space-y-2 rounded-lg border border-red-200 p-3 dark:border-red-900">
          <Textarea
            placeholder="Reason (optional)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[60px]"
          />
          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              Supplier penalty (added to the policy penalty, if any)
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={supplierPenalty}
              onChange={(e) =>
                setSupplierPenalty(e.target.value === "" ? 0 : Number(e.target.value))
              }
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={confirmCancel}
              className="text-red-600 hover:text-red-700"
            >
              Confirm cancellation
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => setCancelling(false)}
            >
              Keep booking
            </Button>
          </div>
        </div>
      )}

      <div>
        <p className="text-muted-foreground mb-1 text-xs">Assigned agent</p>
        <Select value={ownerId ?? NONE} onValueChange={assign} disabled={isPending}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
