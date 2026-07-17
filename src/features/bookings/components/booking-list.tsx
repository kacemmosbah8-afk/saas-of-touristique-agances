import Link from "next/link";
import { CalendarRange, Plus, Users } from "lucide-react";

import type { BookingSummary } from "@/features/bookings/queries/list-bookings.query";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantSlug: string;
  bookings: BookingSummary[];
  canCreate: boolean;
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return "—";
  const fmt = (d: Date) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start ?? end) as Date);
}

export function BookingList({ tenantSlug, bookings, canCreate }: Props) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="No bookings match your filters."
        action={
          canCreate ? (
            <Link href={`/${tenantSlug}/bookings/new`}>
              <Button size="sm">
                <Plus className="mr-1.5 size-4" />
                Create your first booking
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
            <th className="px-4 py-3 text-left font-medium">Reference</th>
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-left font-medium">Travel dates</th>
            <th className="px-4 py-3 text-left font-medium">Pax</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/${tenantSlug}/bookings/${b.id}`}
                  className="font-medium tabular-nums hover:underline"
                >
                  {b.reference}
                </Link>
                {b.packageName && (
                  <p className="text-muted-foreground truncate text-xs">{b.packageName}</p>
                )}
              </td>
              <td className="px-4 py-3">{b.customerName}</td>
              <td className="text-muted-foreground px-4 py-3">
                {formatRange(b.travelStartDate, b.travelEndDate)}
              </td>
              <td className="text-muted-foreground px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {b.adults + b.children}
                </span>
              </td>
              <td className="px-4 py-3">
                <BookingStatusBadge status={b.status} />
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums">
                {formatMoney(b.total, b.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
