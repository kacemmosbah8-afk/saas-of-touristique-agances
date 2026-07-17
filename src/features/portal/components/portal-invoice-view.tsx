import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import type { PortalInvoiceDetail } from "@/features/portal/queries/documents.query";
import { formatDate, formatMoney } from "@/features/portal/lib/format";
import { PrintButton } from "@/features/portal/components/print-button";
import { Badge } from "@/shared/components/ui/badge";
import { StatusBadge } from "@/shared/components/status-badge";
import { cn } from "@/shared/lib/utils";

/**
 * Print-friendly invoice summary — same "browser print → save as PDF"
 * convention `VoucherView` already established for document delivery in
 * this codebase, rather than a new PDF-generation dependency. Built from
 * `PortalInvoiceDetail`, which has already had `internalNotes` stripped at
 * the query boundary (see documents.query.ts) — this component never has
 * access to it in the first place, not just a promise not to render it.
 */
export function PortalInvoiceView({
  tenantSlug,
  bookingId,
  invoice,
}: {
  tenantSlug: string;
  bookingId: string;
  invoice: PortalInvoiceDetail;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/portal/${tenantSlug}/bookings/${bookingId}/documents`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to documents
        </Link>
        <PrintButton />
      </div>

      <div className="bg-card rounded-xl border-2 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Invoice</p>
            <h1 className="text-2xl font-semibold tabular-nums">{invoice.reference}</h1>
            <p className="text-muted-foreground text-sm">{invoice.customerName}</p>
          </div>
          <div className="text-right text-sm">
            <p>Issued {formatDate(invoice.issuedAt)}</p>
            {invoice.dueDate && <p className="text-muted-foreground">Due {formatDate(invoice.dueDate)}</p>}
            {invoice.overdue ? (
              <Badge variant="destructive" className="mt-1">
                Overdue
              </Badge>
            ) : invoice.balance.balanceDue <= 0 ? (
              <StatusBadge tone="success" className="mt-1">
                Paid
              </StatusBadge>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{item.description}</td>
                  <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2 pl-4 text-right whitespace-nowrap tabular-nums">
                    {formatMoney(item.amount, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 ml-auto max-w-56 space-y-1.5 text-sm">
          <Row label="Subtotal" value={formatMoney(invoice.subtotal, invoice.currency)} />
          {invoice.discount > 0 && <Row label="Discount" value={`-${formatMoney(invoice.discount, invoice.currency)}`} />}
          {invoice.tax > 0 && <Row label="Tax" value={formatMoney(invoice.tax, invoice.currency)} />}
          <Row label="Total" value={formatMoney(invoice.total, invoice.currency)} strong />
          <Row label="Paid" value={formatMoney(invoice.amountPaid, invoice.currency)} />
          <Row
            label="Balance due"
            value={formatMoney(invoice.balance.balanceDue, invoice.currency)}
            strong
            valueClassName={invoice.balance.balanceDue > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
          />
        </div>

        {invoice.payments.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <p className="mb-2 text-sm font-medium">Payment history</p>
            <div className="space-y-1.5 text-sm">
              {invoice.payments.map((p) => (
                <div key={p.id} className="flex justify-between gap-4">
                  <span className="text-muted-foreground min-w-0 truncate">
                    {formatDate(p.receivedAt)} · {p.reference}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatMoney(p.amount, p.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {invoice.notes && (
          <p className="text-muted-foreground mt-6 border-t pt-3 text-xs whitespace-pre-wrap">{invoice.notes}</p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  valueClassName,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className={`flex justify-between ${strong ? "border-t pt-1.5 font-semibold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={cn("text-foreground tabular-nums", valueClassName)}>{value}</span>
    </div>
  );
}
