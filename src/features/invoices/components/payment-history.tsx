"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Undo2, X } from "lucide-react";

import {
  recordPaymentAction,
  completePaymentAction,
  failPaymentAction,
  refundPaymentAction,
} from "@/features/payments/actions/payment.action";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_KINDS,
  PAYMENT_KIND_LABELS,
  PAYMENT_STATUS_LABELS,
  recordPaymentSchema,
  type RecordPaymentInput,
} from "@/features/payments/schemas/payment.schema";
import type {
  PaymentView,
  InstallmentView,
} from "@/features/invoices/queries/get-invoice.query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";

const NONE = "__none__";

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
  payments: PaymentView[];
  installments: InstallmentView[];
  balanceDue: number;
  /** invoice is open for collection (ISSUED / PARTIALLY_PAID). */
  canRecord: boolean;
  /** payment:create for recording; payment:manage gates refunds. */
  canCreatePayment: boolean;
  canManagePayment: boolean;
};

const EMPTY: RecordPaymentInput = {
  amount: 0,
  method: "BANK_TRANSFER",
  kind: "BALANCE",
  pending: false,
  receivedAt: "",
  installmentId: "",
  externalReference: "",
  notes: "",
};

export function PaymentHistory({
  tenantId,
  invoiceId,
  currency,
  payments,
  installments,
  balanceDue,
  canRecord,
  canCreatePayment,
  canManagePayment,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<RecordPaymentInput>({ ...EMPTY, amount: balanceDue });
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState("");

  const openInstallments = installments.filter((i) => i.status === "PENDING");
  const showRecordButton = canRecord && canCreatePayment && !recording;

  function startRecord() {
    setDraft({ ...EMPTY, amount: balanceDue });
    setRecording(true);
  }

  function saveRecord() {
    const parsed = recordPaymentSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid payment.");
      return;
    }
    startTransition(async () => {
      const result = await recordPaymentAction(tenantId, invoiceId, parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment recorded.");
      setRecording(false);
      router.refresh();
    });
  }

  function complete(paymentId: string) {
    startTransition(async () => {
      const result = await completePaymentAction(tenantId, paymentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment completed.");
      router.refresh();
    });
  }

  function fail(paymentId: string) {
    startTransition(async () => {
      const result = await failPaymentAction(tenantId, paymentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment marked failed.");
      router.refresh();
    });
  }

  function startRefund(payment: PaymentView) {
    setRefundingId(payment.id);
    setRefundAmount(Math.max(0, payment.amount - payment.refundedAmount));
    setRefundReason("");
  }

  function confirmRefund() {
    if (!refundingId) return;
    startTransition(async () => {
      const result = await refundPaymentAction(tenantId, refundingId, {
        amount: refundAmount,
        reason: refundReason,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Refund recorded.");
      setRefundingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {payments.length === 0 && !recording && (
        <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
          No payments recorded yet.
        </p>
      )}

      {payments.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Reference</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Received</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => {
                const refundable = p.amount - p.refundedAmount;
                return (
                  <tr key={p.id}>
                    <td className="px-3 py-2">
                      <span className="font-medium tabular-nums">{p.reference}</span>
                      <span className="text-muted-foreground block text-xs">
                        {PAYMENT_KIND_LABELS[p.kind]}
                        {p.externalReference ? ` · ${p.externalReference}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2">{PAYMENT_METHOD_LABELS[p.method]}</td>
                    <td className="text-muted-foreground px-3 py-2">
                      {new Date(p.receivedAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          p.status === "COMPLETED" &&
                            "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
                          p.status === "PENDING" &&
                            "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                          p.status === "FAILED" &&
                            "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
                          (p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED") &&
                            "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
                        )}
                      >
                        {PAYMENT_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {money(p.amount, p.currency)}
                      {p.refundedAmount > 0 && (
                        <span className="text-muted-foreground block text-xs">
                          −{money(p.refundedAmount, p.currency)} refunded
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {p.status === "PENDING" && canCreatePayment && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={isPending}
                              onClick={() => complete(p.id)}
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                              disabled={isPending}
                              onClick={() => fail(p.id)}
                            >
                              Failed
                            </Button>
                          </>
                        )}
                        {canManagePayment &&
                          refundable > 0 &&
                          (p.status === "COMPLETED" || p.status === "PARTIALLY_REFUNDED") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              disabled={isPending}
                              onClick={() => startRefund(p)}
                            >
                              <Undo2 className="mr-1 size-3.5" />
                              Refund
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {refundingId && (
        <div className="space-y-2 rounded-lg border border-violet-200 p-3 dark:border-violet-900">
          <p className="text-sm font-medium">Refund payment</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Amount</label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={refundAmount}
                onChange={(e) =>
                  setRefundAmount(e.target.value === "" ? 0 : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                Reason (optional)
              </label>
              <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={isPending} onClick={confirmRefund}>
              Confirm refund
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => setRefundingId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {recording && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Record a payment</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Amount</label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={draft.amount}
                onChange={(e) =>
                  setDraft({ ...draft, amount: e.target.value === "" ? 0 : Number(e.target.value) })
                }
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Balance due: {money(balanceDue, currency)}
              </p>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Method</label>
              <Select
                value={draft.method}
                onValueChange={(v) =>
                  setDraft({ ...draft, method: v as RecordPaymentInput["method"] })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Payment for</label>
              <Select
                value={draft.kind ?? "BALANCE"}
                onValueChange={(v) => setDraft({ ...draft, kind: v as RecordPaymentInput["kind"] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {PAYMENT_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">Received on</label>
              <Input
                type="date"
                value={draft.receivedAt ?? ""}
                onChange={(e) => setDraft({ ...draft, receivedAt: e.target.value })}
              />
            </div>
            {openInstallments.length > 0 && (
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">
                  Settles installment (optional)
                </label>
                <Select
                  value={draft.installmentId ? draft.installmentId : NONE}
                  onValueChange={(v) => {
                    const installment = openInstallments.find((i) => i.id === v);
                    setDraft({
                      ...draft,
                      installmentId: v === NONE ? "" : v,
                      // Picking an installment seeds its amount and kind.
                      ...(installment
                        ? {
                            amount: installment.amount,
                            kind: installment.sequence === 0 ? "DEPOSIT" : "INSTALLMENT",
                          }
                        : {}),
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Not scheduled" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not scheduled</SelectItem>
                    {openInstallments.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.label} · {money(i.amount, currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                External reference (optional)
              </label>
              <Input
                placeholder="Transfer ID, cheque number…"
                value={draft.externalReference ?? ""}
                onChange={(e) => setDraft({ ...draft, externalReference: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="payment-pending"
                className="accent-primary size-4"
                checked={draft.pending === true}
                onChange={(e) => setDraft({ ...draft, pending: e.target.checked })}
              />
              <label htmlFor="payment-pending" className="text-sm">
                Not yet arrived (pending — doesn&apos;t count toward the balance until completed)
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={isPending} onClick={saveRecord}>
              Record payment
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setRecording(false)}>
              <X className="mr-1 size-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showRecordButton && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={startRecord}>
          <Plus className="mr-1.5 size-4" />
          Record payment
        </Button>
      )}
    </div>
  );
}
