import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import type { QuoteSummary } from "@/features/quotes/queries/list-quotes.query";
import { QuoteStatusBadge } from "@/features/quotes/components/quote-status-badge";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantSlug: string;
  quotes: QuoteSummary[];
  canCreate: boolean;
  locale: Locale;
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

export function QuoteList({ tenantSlug, quotes, canCreate, locale }: Props) {
  const dict = getAdminDictionary(locale).quotes;
  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={dict.noMatch}
        action={
          canCreate ? (
            <Link href={`/${tenantSlug}/admin/quotes/new`}>
              <Button size="sm">
                <Plus className="me-1.5 size-4" />
                {dict.createFirstQuote}
              </Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-4 py-3 text-left font-medium">{dict.columnReference}</th>
            <th className="px-4 py-3 text-left font-medium">{dict.columnCustomer}</th>
            <th className="px-4 py-3 text-left font-medium">{dict.columnValidUntil}</th>
            <th className="px-4 py-3 text-left font-medium">{dict.columnStatus}</th>
            <th className="px-4 py-3 text-right font-medium">{dict.columnTotal}</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/${tenantSlug}/admin/quotes/${q.id}`}
                  className="font-medium tabular-nums hover:underline"
                >
                  {q.reference}
                </Link>
                {q.packageName && (
                  <p className="text-muted-foreground truncate text-xs">{q.packageName}</p>
                )}
              </td>
              <td className="px-4 py-3">{q.customerName}</td>
              <td className="text-muted-foreground px-4 py-3">{formatDate(q.validUntil)}</td>
              <td className="px-4 py-3">
                <QuoteStatusBadge status={q.status} />
                {q.convertedBookingId && (
                  <Link
                    href={`/${tenantSlug}/admin/bookings/${q.convertedBookingId}`}
                    className="text-muted-foreground ml-2 text-xs hover:underline"
                  >
                    {dict.viewBooking}
                  </Link>
                )}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {formatMoney(q.total, q.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
