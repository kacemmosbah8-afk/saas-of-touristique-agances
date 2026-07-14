"use client";

import { useState } from "react";

import type { CustomerOption } from "@/features/bookings/queries/booking-options.query";
import type { HotelCancellationPolicyDto } from "@/features/integrations/lib/dto";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is being booked, e.g. "Flight LHR→JFK · British Airways". */
  summary: string;
  /** The live price shown to the agent; the server re-validates regardless. */
  priceLabel: string;
  /** Supplier rate conditions/notices (e.g. Hotelbeds), shown verbatim before confirmation. */
  rateComments?: string | null;
  /** Currency for `cancellationPolicies` amounts (Hotelbeds rates only). */
  currency?: string;
  /** Penalty windows, if any — undefined means "not applicable" (e.g. a
   * flight), an empty array means "no penalty reported," non-empty means
   * a real cancellation deadline the agent must see before confirming. */
  cancellationPolicies?: HotelCancellationPolicyDto[];
  customers: CustomerOption[];
  busy: boolean;
  onConfirm: (customerId: string) => void;
};

function formatCancellationDeadline(value: string | null): string {
  if (!value) return "an unspecified date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

/**
 * Customer picker used by both explorer booking flows. The server action
 * re-validates the supplier price before any booking is written, so this
 * dialog is purely "who is this for?" — never a price authority.
 */
export function CreateBookingDialog({
  open,
  onOpenChange,
  summary,
  priceLabel,
  rateComments,
  currency,
  cancellationPolicies,
  customers,
  busy,
  onConfirm,
}: Props) {
  const [customerId, setCustomerId] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create draft booking</DialogTitle>
          <DialogDescription>
            {summary} — {priceLabel}. The price is re-validated live with the supplier before
            the draft is created.
          </DialogDescription>
        </DialogHeader>

        {cancellationPolicies !== undefined && (
          <div className="rounded-md border p-2 text-xs">
            <p className="font-medium">Cancellation policy</p>
            {cancellationPolicies.length === 0 ? (
              <p className="text-muted-foreground mt-0.5">
                Non-refundable — this rate carries no free cancellation window.
              </p>
            ) : (
              <ul className="text-muted-foreground mt-0.5 space-y-0.5">
                {cancellationPolicies.map((policy, i) => (
                  <li key={i}>
                    Penalty of {currency ?? ""} {policy.amount?.toLocaleString() ?? "an unreported amount"}{" "}
                    applies from {formatCancellationDeadline(policy.from)}.
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {rateComments && (
          <p className="bg-muted text-muted-foreground rounded-md p-2 text-xs italic">
            {rateComments}
          </p>
        )}

        {customers.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No customers yet — create one in CRM first.
          </p>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Customer</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a customer…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !customerId} onClick={() => onConfirm(customerId)}>
            {busy ? "Validating with supplier…" : "Create draft booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
