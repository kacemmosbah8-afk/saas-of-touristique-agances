"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Ticket, X } from "lucide-react";

import {
  generateVoucherAction,
  cancelVoucherAction,
} from "@/features/vouchers/actions/voucher.action";
import type { VoucherSummary } from "@/features/vouchers/queries/voucher.query";
import { BOOKING_ITEM_TYPE_LABELS } from "@/features/bookings/schemas/booking.schema";
import type { BookingItemView } from "@/features/bookings/queries/get-booking.query";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";

type Props = {
  tenantId: string;
  tenantSlug: string;
  bookingId: string;
  vouchers: VoucherSummary[];
  items: BookingItemView[];
  /** Vouchers can be issued (booking confirmed+, has travellers) and the
   * caller may edit the booking. */
  canIssue: boolean;
};

export function VouchersSection({
  tenantId,
  tenantSlug,
  bookingId,
  vouchers,
  items,
  canIssue,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [generating, setGenerating] = useState(false);
  const [itemId, setItemId] = useState<string>("");

  function generate() {
    if (!itemId) {
      toast.error("Pick a service line.");
      return;
    }
    startTransition(async () => {
      const result = await generateVoucherAction(tenantId, bookingId, {
        bookingItemId: itemId,
        notes: "",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Voucher issued.");
      setGenerating(false);
      setItemId("");
      router.refresh();
    });
  }

  function cancel(voucherId: string) {
    startTransition(async () => {
      const result = await cancelVoucherAction(tenantId, voucherId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Voucher cancelled.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {vouchers.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed py-4 text-center text-xs">
          No vouchers issued yet.
        </p>
      )}

      {vouchers.length > 0 && (
        <ul className="space-y-2">
          {vouchers.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <Link
                  href={`/${tenantSlug}/vouchers/${v.id}`}
                  className="inline-flex items-center gap-1 font-medium tabular-nums hover:underline"
                >
                  {v.reference}
                  <ExternalLink className="size-3 opacity-50" />
                </Link>
                <p className="text-muted-foreground truncate text-xs">
                  {BOOKING_ITEM_TYPE_LABELS[v.type]} · {v.serviceDescription}
                  {v.supplierName ? ` · ${v.supplierName}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    v.status === "ISSUED"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
                  )}
                >
                  {v.status === "ISSUED" ? "Issued" : "Cancelled"}
                </span>
                {canIssue && v.status === "ISSUED" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-red-600 hover:text-red-700"
                    disabled={isPending}
                    onClick={() => cancel(v.id)}
                    aria-label="Cancel voucher"
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canIssue && generating && (
        <div className="space-y-2 rounded-lg border p-3">
          <label className="text-muted-foreground block text-xs">Service line</label>
          <Select value={itemId || undefined} onValueChange={setItemId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick the service to voucher…" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {BOOKING_ITEM_TYPE_LABELS[item.type]} — {item.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button size="sm" disabled={isPending} onClick={generate}>
              Issue voucher
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setGenerating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {canIssue && !generating && items.length > 0 && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setGenerating(true)}>
          <Ticket className="mr-1.5 size-4" />
          Issue voucher
        </Button>
      )}
    </div>
  );
}
