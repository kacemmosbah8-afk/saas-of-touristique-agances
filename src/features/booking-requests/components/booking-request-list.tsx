import Link from "next/link";
import { ClipboardList, Users } from "lucide-react";

import type { BookingRequestSummary } from "@/features/booking-requests/queries/list-booking-requests.query";
import { BookingRequestStatusBadge } from "@/features/booking-requests/components/booking-request-status-badge";
import { EmptyState } from "@/shared/components/empty-state";
import type { Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantSlug: string;
  bookingRequests: BookingRequestSummary[];
  locale: Locale;
};

const PRODUCT_TYPE_LABELS_AR: Record<BookingRequestSummary["productType"], string> = {
  PACKAGE: "باقة",
  HOTEL: "فندق",
  DESTINATION: "وجهة",
  ACTIVITY: "نشاط",
  FLIGHT: "رحلة جوية",
};
const PRODUCT_TYPE_LABELS_FR: Record<BookingRequestSummary["productType"], string> = {
  PACKAGE: "Forfait",
  HOTEL: "Hôtel",
  DESTINATION: "Destination",
  ACTIVITY: "Activité",
  FLIGHT: "Vol",
};

function formatDate(date: Date | null): string {
  return date
    ? new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

export function BookingRequestList({ tenantSlug, bookingRequests, locale }: Props) {
  const dict = getAdminDictionary(locale).bookingRequests;
  const productTypeLabels = locale === "fr" ? PRODUCT_TYPE_LABELS_FR : PRODUCT_TYPE_LABELS_AR;

  if (bookingRequests.length === 0) {
    return <EmptyState icon={ClipboardList} title={dict.noMatch} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-4 py-3 text-start font-medium">{dict.reference}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.requestedBy}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.product}</th>
            <th className="hidden px-4 py-3 text-start font-medium sm:table-cell">{dict.travelDate}</th>
            <th className="hidden px-4 py-3 text-start font-medium md:table-cell">{dict.pax}</th>
            <th className="px-4 py-3 text-start font-medium">{dict.status}</th>
            <th className="hidden px-4 py-3 text-start font-medium lg:table-cell">{dict.received}</th>
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
                <p className="text-muted-foreground text-xs">{productTypeLabels[r.productType]}</p>
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
