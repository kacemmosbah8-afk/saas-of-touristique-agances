"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";

import {
  issueInvoiceAction,
  voidInvoiceAction,
  resendInvoiceEmailAction,
} from "@/features/invoices/actions/invoice.action";
import { canIssue, canVoid } from "@/features/invoices/lib/invoice-status";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

type Props = {
  tenantId: string;
  invoiceId: string;
  status: InvoiceStatus;
  /** True when nothing is net-paid — the precondition for voiding. */
  nothingNetPaid: boolean;
  canEdit: boolean;
  canManage: boolean;
};

export function InvoiceStatusActions({
  tenantId,
  invoiceId,
  status,
  nothingNetPaid,
  canEdit,
  canManage,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [issuing, setIssuing] = useState(false);
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const showIssue = canEdit && canIssue(status);
  const showVoid = canManage && canVoid(status);
  const showResend = canEdit && status !== "DRAFT" && status !== "VOID";

  function confirmIssue() {
    startTransition(async () => {
      const result = await issueInvoiceAction(tenantId, invoiceId, { dueDate });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Invoice issued.");
      setIssuing(false);
      router.refresh();
    });
  }

  function resendEmail() {
    startTransition(async () => {
      const result = await resendInvoiceEmailAction(tenantId, invoiceId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Invoice emailed to the customer.");
      router.refresh();
    });
  }

  function confirmVoid() {
    startTransition(async () => {
      const result = await voidInvoiceAction(tenantId, invoiceId, { reason: voidReason });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Invoice voided.");
      setVoiding(false);
      setVoidReason("");
      router.refresh();
    });
  }

  if (!showIssue && !showVoid && !showResend) return null;

  return (
    <div className="space-y-3">
      {showIssue && !issuing && (
        <Button size="sm" className="w-full" disabled={isPending} onClick={() => setIssuing(true)}>
          <Send className="mr-1.5 size-4" />
          Issue invoice
        </Button>
      )}

      {showResend && !issuing && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={isPending}
          onClick={resendEmail}
        >
          <Mail className="mr-1.5 size-4" />
          {isPending ? "Sending…" : "Email invoice to customer"}
        </Button>
      )}

      {issuing && (
        <div className="space-y-2 rounded-lg border p-3">
          <label className="text-muted-foreground block text-xs">Payment due date</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <p className="text-muted-foreground text-xs">
            Issuing locks the line items and starts collection.
          </p>
          <div className="flex gap-2">
            <Button size="sm" disabled={isPending} onClick={confirmIssue}>
              Confirm issue
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setIssuing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showVoid && !voiding && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => setVoiding(true)}
          className="w-full text-red-600 hover:text-red-700"
        >
          Void invoice
        </Button>
      )}

      {voiding && (
        <div className="space-y-2 rounded-lg border border-red-200 p-3 dark:border-red-900">
          {!nothingNetPaid && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Payments are recorded on this invoice — refund them before voiding.
            </p>
          )}
          <Textarea
            placeholder="Reason (required)…"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isPending || !nothingNetPaid || voidReason.trim().length === 0}
              onClick={confirmVoid}
              className="text-red-600 hover:text-red-700"
            >
              Confirm void
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setVoiding(false)}>
              Keep invoice
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
