import Link from "next/link";
import { CreditCard } from "lucide-react";

import type { PaymentSummary } from "@/features/payments/queries/list-payments.query";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_KIND_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/features/payments/schemas/payment.schema";
import { cn } from "@/shared/lib/utils";

type Props = {
  tenantSlug: string;
  payments: PaymentSummary[];
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function PaymentsList({ tenantSlug, payments }: Props) {
  if (payments.length === 0) {
    return (
      <div className="border-muted flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <CreditCard className="text-muted-foreground size-8" />
        <p className="text-muted-foreground text-sm">
          No payments match your filters. Payments are recorded from an invoice&apos;s detail page.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-b text-left text-xs">
          <tr>
            <th className="px-4 py-2.5 font-medium">Reference</th>
            <th className="px-4 py-2.5 font-medium">Invoice</th>
            <th className="px-4 py-2.5 font-medium">Customer</th>
            <th className="px-4 py-2.5 font-medium">Method</th>
            <th className="px-4 py-2.5 font-medium">Received</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-muted/50">
              <td className="px-4 py-2.5">
                <span className="font-medium tabular-nums">{p.reference}</span>
                <span className="text-muted-foreground block text-xs">
                  {PAYMENT_KIND_LABELS[p.kind]}
                  {p.externalReference ? ` · ${p.externalReference}` : ""}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <Link
                  href={`/${tenantSlug}/invoices/${p.invoiceId}`}
                  className="tabular-nums hover:underline"
                >
                  {p.invoiceReference}
                </Link>
              </td>
              <td className="px-4 py-2.5">{p.customerName}</td>
              <td className="text-muted-foreground px-4 py-2.5">
                {PAYMENT_METHOD_LABELS[p.method]}
              </td>
              <td className="text-muted-foreground px-4 py-2.5">
                {new Date(p.receivedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </td>
              <td className="px-4 py-2.5">
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
              <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                {formatMoney(p.amount, p.currency)}
                {p.refundedAmount > 0 && (
                  <span className="text-muted-foreground block text-xs">
                    −{formatMoney(p.refundedAmount, p.currency)} refunded
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
