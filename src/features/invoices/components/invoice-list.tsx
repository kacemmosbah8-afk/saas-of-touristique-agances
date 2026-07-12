import Link from "next/link";
import { Receipt, Plus } from "lucide-react";

import type { InvoiceSummary } from "@/features/invoices/queries/list-invoices.query";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

type Props = {
  tenantSlug: string;
  invoices: InvoiceSummary[];
  canCreate: boolean;
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function InvoiceList({ tenantSlug, invoices, canCreate }: Props) {
  if (invoices.length === 0) {
    return (
      <div className="border-muted flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Receipt className="text-muted-foreground size-8" />
        <p className="text-muted-foreground text-sm">No invoices match your filters.</p>
        {canCreate && (
          <Link href={`/${tenantSlug}/invoices/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Create your first invoice
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-b text-left text-xs">
          <tr>
            <th className="px-4 py-2.5 font-medium">Reference</th>
            <th className="px-4 py-2.5 font-medium">Customer</th>
            <th className="px-4 py-2.5 font-medium">Due</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 text-right font-medium">Total</th>
            <th className="px-4 py-2.5 text-right font-medium">Balance due</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-muted/50">
              <td className="px-4 py-2.5">
                <Link
                  href={`/${tenantSlug}/invoices/${inv.id}`}
                  className="font-medium tabular-nums hover:underline"
                >
                  {inv.reference}
                </Link>
                {inv.bookingReference && (
                  <p className="text-muted-foreground truncate text-xs">
                    {inv.bookingReference}
                  </p>
                )}
              </td>
              <td className="px-4 py-2.5">{inv.customerName}</td>
              <td
                className={cn(
                  "px-4 py-2.5",
                  inv.overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground",
                )}
              >
                {formatDate(inv.dueDate)}
              </td>
              <td className="px-4 py-2.5">
                <InvoiceStatusBadge status={inv.status} overdue={inv.overdue} />
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatMoney(inv.total, inv.currency)}
              </td>
              <td
                className={cn(
                  "px-4 py-2.5 text-right font-medium tabular-nums",
                  inv.balanceDue > 0 && inv.status !== "DRAFT" && inv.status !== "VOID"
                    ? ""
                    : "text-muted-foreground",
                )}
              >
                {formatMoney(inv.balanceDue, inv.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
