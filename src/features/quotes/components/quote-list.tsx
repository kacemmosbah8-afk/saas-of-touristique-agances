import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import type { QuoteSummary } from "@/features/quotes/queries/list-quotes.query";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantSlug: string;
  quotes: QuoteSummary[];
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

export function QuoteList({ tenantSlug, quotes, canCreate }: Props) {
  if (quotes.length === 0) {
    return (
      <div className="border-muted flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <FileText className="text-muted-foreground size-8" />
        <p className="text-muted-foreground text-sm">No quotes match your filters.</p>
        {canCreate && (
          <Link href={`/${tenantSlug}/quotes/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Create your first quote
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
            <th className="px-4 py-2.5 font-medium">Valid until</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {quotes.map((q) => (
            <tr key={q.id} className="hover:bg-muted/50">
              <td className="px-4 py-2.5">
                <Link
                  href={`/${tenantSlug}/quotes/${q.id}`}
                  className="font-medium tabular-nums hover:underline"
                >
                  {q.reference}
                </Link>
                {q.packageName && (
                  <p className="text-muted-foreground truncate text-xs">{q.packageName}</p>
                )}
              </td>
              <td className="px-4 py-2.5">{q.customerName}</td>
              <td className="text-muted-foreground px-4 py-2.5">{formatDate(q.validUntil)}</td>
              <td className="px-4 py-2.5">
                <QuoteStatusBadge status={q.status} />
                {q.convertedBookingId && (
                  <Link
                    href={`/${tenantSlug}/bookings/${q.convertedBookingId}`}
                    className="text-muted-foreground ml-2 text-xs hover:underline"
                  >
                    View booking
                  </Link>
                )}
              </td>
              <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                {formatMoney(q.total, q.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
