import Link from "next/link";
import { CreditCard } from "lucide-react";

import type { PaymentSummary } from "@/features/payments/queries/list-payments.query";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_KIND_LABELS,
  PAYMENT_STATUS_LABELS,
  type PAYMENT_STATUSES,
} from "@/features/payments/schemas/payment.schema";
import { EmptyState } from "@/shared/components/empty-state";
import { StatusBadge } from "@/shared/components/status-badge";
import type { StatusTone } from "@/shared/lib/status-tone";

const PAYMENT_STATUS_TONE: Record<(typeof PAYMENT_STATUSES)[number], StatusTone> = {
  COMPLETED: "success",
  PENDING: "warning",
  FAILED: "danger",
  REFUNDED: "special",
  PARTIALLY_REFUNDED: "special",
};

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
      <EmptyState
        icon={CreditCard}
        title="No payments match your filters. Payments are recorded from an invoice's detail page."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-4 py-3 text-left font-medium">Reference</th>
            <th className="px-4 py-3 text-left font-medium">Invoice</th>
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-left font-medium">Method</th>
            <th className="px-4 py-3 text-left font-medium">Received</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <span className="font-medium tabular-nums">{p.reference}</span>
                <span className="text-muted-foreground block text-xs">
                  {PAYMENT_KIND_LABELS[p.kind]}
                  {p.externalReference ? ` · ${p.externalReference}` : ""}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/${tenantSlug}/invoices/${p.invoiceId}`}
                  className="tabular-nums hover:underline"
                >
                  {p.invoiceReference}
                </Link>
              </td>
              <td className="px-4 py-3">{p.customerName}</td>
              <td className="text-muted-foreground px-4 py-3">
                {PAYMENT_METHOD_LABELS[p.method]}
              </td>
              <td className="text-muted-foreground px-4 py-3">
                {new Date(p.receivedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </td>
              <td className="px-4 py-3">
                <StatusBadge tone={PAYMENT_STATUS_TONE[p.status]}>
                  {PAYMENT_STATUS_LABELS[p.status]}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
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
