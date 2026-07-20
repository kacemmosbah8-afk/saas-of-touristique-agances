import Link from "next/link";
import { ClipboardList, Users } from "lucide-react";

import type { BookingRequestSummary } from "@/features/booking-requests/queries/list-booking-requests.query";
import { BookingRequestStatusBadge } from "@/features/booking-requests/components/booking-request-status-badge";
import { EmptyState } from "@/shared/components/empty-state";

type Props = {
  tenantSlug: string;
  bookingRequests: BookingRequestSummary[];
};

const PRODUCT_TYPE_LABELS: Record<BookingRequestSummary["productType"], string> = {
  PACKAGE: "Package",
  HOTEL: "Hotel",
  DESTINATION: "Destination",
  ACTIVITY: "Activity",
  FLIGHT: "Flight",
};

function formatDate(date: Date | null): string {
  return date
    ? new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

export function BookingRequestList({ tenantSlug, bookingRequests }: Props) {
  if (bookingRequests.length === 0) {
    return <EmptyState icon={ClipboardList} title="No booking requests match your filters." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-4 py-3 text-left font-medium">Reference</th>
            <th className="px-4 py-3 text-left font-medium">Requested by</th>
            <th className="px-4 py-3 text-left font-medium">Product</th>
            <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Travel date</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Pax</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Received</th>
          </tr>
        </thead>
        <tbody>
          {bookingRequests.map((r) => (
            <tr key={r.id} className="hover:bg-muted/20 border-b last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/${tenantSlug}/admin/booking-requests/${r.id}`}
                  className="font-medium tabular-nums hover:underline"
                >
                  {r.reference}
                </Link>
              </td>
              <td className="px-4 py-3">
                <p>{r.fullName}</p>
                <p className="text-muted-foreground text-xs">{r.email}</p>
              </td>
              <td className="px-4 py-3">
                <p className="truncate">{r.productName}</p>
                <p className="text-muted-foreground text-xs">{PRODUCT_TYPE_LABELS[r.productType]}</p>
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                {formatDate(r.preferredDate)}
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {r.adults + r.children}
                </span>
              </td>
              <td className="px-4 py-3">
                <BookingRequestStatusBadge status={r.status} />
              </td>
              <td className="text-muted-foreground hidden px-4 py-3 lg:table-cell">
                {new Date(r.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
