"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import type { QuoteStatus } from "@prisma/client";

import {
  updateQuoteStatusAction,
  declineQuoteAction,
  assignQuoteAction,
  convertQuoteToBookingAction,
} from "@/features/quotes/actions/quote.action";
import {
  nextStatuses,
  canConvert,
  QUOTE_STATUS_LABELS,
} from "@/features/quotes/lib/quote-status";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";
import { Button } from "@/shared/components/ui/button";
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
  tenantSlug: string;
  quoteId: string;
  status: QuoteStatus;
  ownerId: string | null;
  members: MemberOption[];
  canEdit: boolean;
  canConvertToBooking: boolean;
};

export function QuoteStatusActions({
  tenantId,
  tenantSlug,
  quoteId,
  status,
  ownerId,
  members,
  canEdit,
  canConvertToBooking,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  // DECLINED goes through the dedicated reason flow; the rest are plain buttons.
  const transitions = nextStatuses(status).filter((s) => s !== "DECLINED" && s !== "CONVERTED");
  const canDecline = nextStatuses(status).includes("DECLINED");
  const showConvert = canConvertToBooking && canConvert(status);

  function moveTo(target: QuoteStatus) {
    startTransition(async () => {
      const result = await updateQuoteStatusAction(tenantId, quoteId, { status: target });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Quote marked ${QUOTE_STATUS_LABELS[target].toLowerCase()}.`);
      router.refresh();
    });
  }

  function confirmDecline() {
    startTransition(async () => {
      const result = await declineQuoteAction(tenantId, quoteId, { reason });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Quote declined.");
      setDeclining(false);
      setReason("");
      router.refresh();
    });
  }

  function convert() {
    startTransition(async () => {
      const result = await convertQuoteToBookingAction(tenantId, quoteId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Booking created from quote.");
      router.push(`/${tenantSlug}/admin/bookings/${result.data.bookingId}`);
    });
  }

  function assign(next: string) {
    startTransition(async () => {
      const result = await assignQuoteAction(tenantId, quoteId, {
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
      {showConvert && (
        <Button size="sm" className="w-full" disabled={isPending} onClick={convert}>
          <ArrowRight className="mr-1.5 size-4" />
          Convert to booking
        </Button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {transitions.map((target) => (
          <Button key={target} size="sm" disabled={isPending} onClick={() => moveTo(target)}>
            Mark {QUOTE_STATUS_LABELS[target].toLowerCase()}
          </Button>
        ))}
        {canDecline && !declining && (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setDeclining(true)}
            className="text-red-600 hover:text-red-700"
          >
            Decline
          </Button>
        )}
      </div>

      {declining && (
        <div className="space-y-2 rounded-lg border border-red-200 p-3 dark:border-red-900">
          <Textarea
            placeholder="Reason (optional)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={confirmDecline}
              className="text-red-600 hover:text-red-700"
            >
              Confirm decline
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setDeclining(false)}>
              Keep quote
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
