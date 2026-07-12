"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

import {
  issueCreditNoteAction,
  voidCreditNoteAction,
} from "@/features/invoices/actions/credit-note.action";
import type { CreditNoteView } from "@/features/invoices/queries/get-invoice.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

type Props = {
  tenantId: string;
  invoiceId: string;
  currency: string;
  creditNotes: CreditNoteView[];
  /** Invoice state allows issuing (open or paid) AND caller holds invoice:manage. */
  canIssue: boolean;
};

export function CreditNotesSection({ tenantId, invoiceId, currency, creditNotes, canIssue }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [issuing, setIssuing] = useState(false);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");

  function confirmIssue() {
    startTransition(async () => {
      const result = await issueCreditNoteAction(tenantId, invoiceId, { amount, reason });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Credit note issued.");
      setIssuing(false);
      setAmount(0);
      setReason("");
      router.refresh();
    });
  }

  function voidNote(creditNoteId: string) {
    startTransition(async () => {
      const result = await voidCreditNoteAction(tenantId, creditNoteId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Credit note voided.");
      router.refresh();
    });
  }

  if (creditNotes.length === 0 && !canIssue) return null;

  return (
    <div className="space-y-3">
      {creditNotes.length > 0 && (
        <ul className="space-y-2">
          {creditNotes.map((note) => (
            <li
              key={note.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
                note.status === "VOID" && "opacity-60",
              )}
            >
              <div>
                <p className="font-medium tabular-nums">
                  {note.reference}
                  {note.status === "VOID" && (
                    <span className="text-muted-foreground ml-2 text-xs">(voided)</span>
                  )}
                </p>
                {note.reason && <p className="text-muted-foreground text-xs">{note.reason}</p>}
                <p className="text-muted-foreground text-xs">
                  {new Date(note.issuedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    note.status === "VOID" && "line-through",
                  )}
                >
                  −{money(note.amount, currency)}
                </span>
                {canIssue && note.status === "ISSUED" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                    disabled={isPending}
                    onClick={() => voidNote(note.id)}
                  >
                    Void
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {issuing && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Amount</label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? 0 : Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Reason (optional)</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={isPending} onClick={confirmIssue}>
              Issue credit note
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setIssuing(false)}>
              <X className="mr-1 size-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {canIssue && !issuing && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => setIssuing(true)}>
          <Plus className="mr-1.5 size-4" />
          Issue credit note
        </Button>
      )}
    </div>
  );
}
