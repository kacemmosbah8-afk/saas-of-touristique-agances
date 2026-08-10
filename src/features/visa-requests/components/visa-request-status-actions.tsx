"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Mail, Phone, MessageCircle } from "lucide-react";
import type { VisaRequestStatus } from "@prisma/client";

import {
  updateVisaRequestStatusAction,
  addVisaRequestNoteAction,
} from "@/features/visa-requests/actions/visa-request.action";
import { canTransition, VISA_REQUEST_STATUS_LABELS } from "@/features/visa-requests/lib/status";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import type { Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantId: string;
  visaRequestId: string;
  status: VisaRequestStatus;
  email: string | null;
  phone: string;
  whatsapp: string | null;
  locale: Locale;
};

/** Forward, non-terminal targets a status can move to — reject/cancel get their own reason flow below. */
const FORWARD_TARGETS: readonly VisaRequestStatus[] = [
  "CONTACTED",
  "DOCUMENTS_REQUESTED",
  "IN_PROGRESS",
  "APPROVED",
];

export function VisaRequestStatusActions({
  tenantId,
  visaRequestId,
  status,
  email,
  phone,
  whatsapp,
  locale,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reasonFlow, setReasonFlow] = useState<"REJECTED" | "CANCELLED" | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const dict = getAdminDictionary(locale).visaRequests;

  function moveTo(target: VisaRequestStatus) {
    startTransition(async () => {
      const result = await updateVisaRequestStatusAction(tenantId, visaRequestId, { status: target });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.statusUpdated);
      router.refresh();
    });
  }

  function confirmReasonFlow() {
    if (!reasonFlow) return;
    const target = reasonFlow;
    startTransition(async () => {
      const result = await updateVisaRequestStatusAction(tenantId, visaRequestId, {
        status: target,
        reason,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(target === "REJECTED" ? dict.requestRejected : dict.requestCancelled);
      setReasonFlow(null);
      setReason("");
      router.refresh();
    });
  }

  function submitNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      const result = await addVisaRequestNoteAction(tenantId, visaRequestId, { note });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.noteAdded);
      setNote("");
      setAddingNote(false);
      router.refresh();
    });
  }

  // mailto:/tel: links only do something if the OS/browser has a registered
  // handler for that protocol — silently inert otherwise. Copy-to-clipboard
  // works regardless, so staff can always paste the value into whatever
  // mail/phone app they actually use.
  function copyToClipboard(value: string, message: string) {
    navigator.clipboard.writeText(value).then(() => toast.success(message));
  }

  const forwardTargets = FORWARD_TARGETS.filter(
    (target) => target !== status && canTransition(status, target),
  );
  const canRevertToPending = status !== "PENDING" && canTransition(status, "PENDING");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {email && (
          <>
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${email}`}>
                <Mail className="me-1.5 size-4" />
                {dict.emailAction}
              </a>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => copyToClipboard(email, dict.emailCopied)}
              aria-label={dict.copyEmail}
            >
              <Copy className="size-3.5" />
            </Button>
          </>
        )}
        <Button asChild size="sm" variant="outline">
          <a href={`tel:${phone}`}>
            <Phone className="me-1.5 size-4" />
            {dict.call}
          </a>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={() => copyToClipboard(phone, dict.phoneCopied)}
          aria-label={dict.copyPhone}
        >
          <Copy className="size-3.5" />
        </Button>
        {whatsapp && (
          <Button asChild size="sm" variant="outline">
            <a
              href={`https://wa.me/${whatsapp.replace(/[^\d+]/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="me-1.5 size-4" />
              {dict.whatsapp}
            </a>
          </Button>
        )}
      </div>

      {!reasonFlow && (
        <div className="flex flex-wrap items-center gap-2">
          {forwardTargets.map((target) => (
            <Button
              key={target}
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => moveTo(target)}
            >
              {VISA_REQUEST_STATUS_LABELS[target]}
            </Button>
          ))}
          {canRevertToPending && (
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => moveTo("PENDING")}>
              {dict.revertToPending}
            </Button>
          )}
          {canTransition(status, "REJECTED") && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setReasonFlow("REJECTED")}
              className="text-red-600 hover:text-red-700"
            >
              {dict.reject}
            </Button>
          )}
          {canTransition(status, "CANCELLED") && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => setReasonFlow("CANCELLED")}
              className="text-red-600 hover:text-red-700"
            >
              {dict.cancelAction}
            </Button>
          )}
        </div>
      )}

      {reasonFlow && (
        <div className="space-y-2 rounded-lg border border-red-200 p-3 dark:border-red-900">
          <Textarea
            placeholder={dict.reasonPlaceholder}
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
              {reasonFlow === "REJECTED" ? dict.confirmReject : dict.confirmCancel}
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setReasonFlow(null)}>
              {dict.back}
            </Button>
          </div>
        </div>
      )}

      <div>
        {!addingNote ? (
          <Button size="sm" variant="ghost" onClick={() => setAddingNote(true)}>
            {dict.addNote}
          </Button>
        ) : (
          <div className="space-y-2">
            <Textarea
              placeholder={dict.notePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={isPending || !note.trim()} onClick={submitNote}>
                {dict.saveNote}
              </Button>
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setAddingNote(false)}>
                {dict.cancelAction}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
