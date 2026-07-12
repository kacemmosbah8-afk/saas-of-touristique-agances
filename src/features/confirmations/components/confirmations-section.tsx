"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";

import {
  requestConfirmationAction,
  confirmSupplierConfirmationAction,
  rejectSupplierConfirmationAction,
} from "@/features/confirmations/actions/confirmation.action";
import { CONFIRMATION_STATUS_LABELS } from "@/features/confirmations/schemas/confirmation.schema";
import type { ConfirmableItem } from "@/features/confirmations/queries/booking-confirmations.query";
import { BOOKING_ITEM_TYPE_LABELS } from "@/features/bookings/schemas/booking.schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

type Props = {
  tenantId: string;
  bookingId: string;
  items: ConfirmableItem[];
  editable: boolean;
};

type Flow =
  | { kind: "request"; itemId: string }
  | { kind: "confirm"; confirmationId: string }
  | { kind: "reject"; confirmationId: string }
  | null;

export function ConfirmationsSection({ tenantId, bookingId, items, editable }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [flow, setFlow] = useState<Flow>(null);
  const [supplierName, setSupplierName] = useState("");
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setFlow(null);
    setSupplierName("");
    setConfirmationNumber("");
    setNotes("");
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(success);
      reset();
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed py-4 text-center text-xs">
        Add line items to track supplier confirmations.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((item) => {
          const c = item.confirmation;
          return (
            <li key={item.id} className="rounded-lg border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.description}</p>
                  <p className="text-muted-foreground text-xs">
                    {BOOKING_ITEM_TYPE_LABELS[item.type]}
                    {c?.supplierName ? ` · ${c.supplierName}` : ""}
                    {c?.status === "CONFIRMED" && c.confirmationNumber
                      ? ` · #${c.confirmationNumber}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        c.status === "CONFIRMED" &&
                          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
                        c.status === "PENDING" &&
                          "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                        c.status === "REJECTED" &&
                          "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
                      )}
                    >
                      {CONFIRMATION_STATUS_LABELS[c.status]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Not requested</span>
                  )}

                  {editable && !c && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={isPending}
                      onClick={() => {
                        reset();
                        setFlow({ kind: "request", itemId: item.id });
                      }}
                    >
                      <Send className="mr-1 size-3" />
                      Request
                    </Button>
                  )}
                  {editable && c?.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={isPending}
                        onClick={() => {
                          reset();
                          setFlow({ kind: "confirm", confirmationId: c.id });
                        }}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                        disabled={isPending}
                        onClick={() => {
                          reset();
                          setFlow({ kind: "reject", confirmationId: c.id });
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {editable && c?.status === "REJECTED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={isPending}
                      onClick={() => {
                        reset();
                        setFlow({ kind: "request", itemId: item.id });
                      }}
                    >
                      Re-request
                    </Button>
                  )}
                </div>
              </div>

              {flow?.kind === "request" && flow.itemId === item.id && (
                <div className="mt-2 space-y-2 border-t pt-2">
                  <Input
                    placeholder="Supplier name (optional)"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        run(
                          () =>
                            requestConfirmationAction(tenantId, bookingId, item.id, {
                              supplierName,
                              notes: "",
                            }),
                          "Confirmation requested.",
                        )
                      }
                    >
                      Send request
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={reset}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {flow?.kind === "confirm" && c && flow.confirmationId === c.id && (
                <div className="mt-2 space-y-2 border-t pt-2">
                  <Input
                    placeholder="Confirmation number"
                    value={confirmationNumber}
                    onChange={(e) => setConfirmationNumber(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={isPending || !confirmationNumber.trim()}
                      onClick={() =>
                        run(
                          () =>
                            confirmSupplierConfirmationAction(tenantId, c.id, {
                              confirmationNumber: confirmationNumber.trim(),
                              notes: "",
                            }),
                          "Marked confirmed.",
                        )
                      }
                    >
                      Save confirmation
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={reset}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {flow?.kind === "reject" && c && flow.confirmationId === c.id && (
                <div className="mt-2 space-y-2 border-t pt-2">
                  <Input
                    placeholder="Reason (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      disabled={isPending}
                      onClick={() =>
                        run(
                          () => rejectSupplierConfirmationAction(tenantId, c.id, { notes }),
                          "Marked rejected.",
                        )
                      }
                    >
                      Mark rejected
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isPending} onClick={reset}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
