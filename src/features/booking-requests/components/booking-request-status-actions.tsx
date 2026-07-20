"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Mail, Phone, MessageCircle } from "lucide-react";
import type { BookingRequestStatus } from "@prisma/client";

import {
  updateBookingRequestStatusAction,
  addBookingRequestNoteAction,
  convertBookingRequestAction,
} from "@/features/booking-requests/actions/booking-request.action";
import { canConvert } from "@/features/booking-requests/lib/status";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

type Props = {
  tenantId: string;
  tenantSlug: string;
  bookingRequestId: string;
  status: BookingRequestStatus;
  email: string;
  phone: string | null;
  whatsapp: string | null;
};

export function BookingRequestStatusActions({
  tenantId,
  tenantSlug,
  bookingRequestId,
  status,
  email,
  phone,
  whatsapp,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reasonFlow, setReasonFlow] = useState<"REJECTED" | "CANCELLED" | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  function markContacted() {
    startTransition(async () => {
      const result = await updateBookingRequestStatusAction(tenantId, bookingRequestId, {
        status: "CONTACTED",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked as contacted.");
      router.refresh();
    });
  }

  function revertToPending() {
    startTransition(async () => {
      const result = await updateBookingRequestStatusAction(tenantId, bookingRequestId, {
        status: "PENDING",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function confirmReasonFlow() {
    if (!reasonFlow) return;
    const target = reasonFlow;
    startTransition(async () => {
      const result = await updateBookingRequestStatusAction(tenantId, bookingRequestId, {
        status: target,
        reason,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(target === "REJECTED" ? "Request rejected." : "Request cancelled.");
      setReasonFlow(null);
      setReason("");
      router.refresh();
    });
  }

  function convert() {
    startTransition(async () => {
      const result = await convertBookingRequestAction(tenantId, bookingRequestId, {});
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Booking created from request.");
      router.push(`/${tenantSlug}/admin/bookings/${result.data.bookingId}`);
    });
  }

  function submitNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      const result = await addBookingRequestNoteAction(tenantId, bookingRequestId, { note });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Note added.");
      setNote("");
      setAddingNote(false);
      router.refresh();
    });
  }

  const showConvert = canConvert(status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={`mailto:${email}`}>
            <Mail className="mr-1.5 size-4" />
            Email
          </a>
        </Button>
        {phone && (
          <Button asChild size="sm" variant="outline">
            <a href={`tel:${phone}`}>
              <Phone className="mr-1.5 size-4" />
              Call
            </a>
          </Button>
        )}
        {whatsapp && (
          <Button asChild size="sm" variant="outline">
            <a
              href={`https://wa.me/${whatsapp.replace(/[^\d+]/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="mr-1.5 size-4" />
              WhatsApp
            </a>
          </Button>
        )}
      </div>

      {showConvert && (
        <Button size="sm" className="w-full" disabled={isPending} onClick={convert}>
          <ArrowRight className="mr-1.5 size-4" />
          Convert to booking
        </Button>
      )}

      {(status === "PENDING" || status === "CONTACTED") && !reasonFlow && (
        <div className="flex flex-wrap items-center gap-2">
          {status === "PENDING" && (
            <Button size="sm" variant="secondary" disabled={isPending} onClick={markContacted}>
              Mark contacted
            </Button>
          )}
          {status === "CONTACTED" && (
            <Button size="sm" variant="secondary" disabled={isPending} onClick={revertToPending}>
              Revert to pending
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setReasonFlow("REJECTED")}
            className="text-red-600 hover:text-red-700"
          >
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => setReasonFlow("CANCELLED")}
            className="text-red-600 hover:text-red-700"
          >
            Cancel
          </Button>
        </div>
      )}

      {reasonFlow && (
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
              onClick={confirmReasonFlow}
              className="text-red-600 hover:text-red-700"
            >
              Confirm {reasonFlow === "REJECTED" ? "reject" : "cancel"}
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setReasonFlow(null)}>
              Back
            </Button>
          </div>
        </div>
      )}

      <div>
        {!addingNote ? (
          <Button size="sm" variant="ghost" onClick={() => setAddingNote(true)}>
            + Add note
          </Button>
        ) : (
          <div className="space-y-2">
            <Textarea
              placeholder="e.g. Called, left voicemail…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={isPending || !note.trim()} onClick={submitNote}>
                Save note
              </Button>
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setAddingNote(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
