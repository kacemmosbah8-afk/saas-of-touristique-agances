import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";

import type { BookingRequestDetail as BookingRequestDetailData } from "@/features/booking-requests/queries/get-booking-request.query";
import { BookingRequestStatusBadge } from "@/features/booking-requests/components/booking-request-status-badge";
import { BookingRequestStatusActions } from "@/features/booking-requests/components/booking-request-status-actions";
import type { Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

type Props = {
  tenantId: string;
  tenantSlug: string;
  bookingRequest: BookingRequestDetailData;
  canEdit: boolean;
  locale: Locale;
};

const PRODUCT_PATH_SEGMENT: Record<BookingRequestDetailData["productType"], string> = {
  PACKAGE: "packages",
  HOTEL: "hotels",
  DESTINATION: "destinations",
  ACTIVITY: "activities",
  FLIGHT: "flights",
};

const PRODUCT_TYPE_LABELS_AR: Record<BookingRequestDetailData["productType"], string> = {
  PACKAGE: "باقة",
  HOTEL: "فندق",
  DESTINATION: "وجهة",
  ACTIVITY: "نشاط",
  FLIGHT: "رحلة جوية",
};
const PRODUCT_TYPE_LABELS_FR: Record<BookingRequestDetailData["productType"], string> = {
  PACKAGE: "Forfait",
  HOTEL: "Hôtel",
  DESTINATION: "Destination",
  ACTIVITY: "Activité",
  FLIGHT: "Vol",
};

function formatDate(date: Date | null): string {
  return date ? new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

export function BookingRequestDetail({ tenantId, tenantSlug, bookingRequest, canEdit, locale }: Props) {
  const dict = getAdminDictionary(locale).bookingRequests;
  const common = getAdminDictionary(locale).common;
  const productTypeLabels = locale === "fr" ? PRODUCT_TYPE_LABELS_FR : PRODUCT_TYPE_LABELS_AR;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/booking-requests`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.pageTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tabular-nums">{bookingRequest.reference}</h1>
          <BookingRequestStatusBadge status={bookingRequest.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {bookingRequest.fullName} · {bookingRequest.productName}
        </p>
      </div>

      {bookingRequest.status === "CONFIRMED" && bookingRequest.convertedBookingId && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
          <p className="flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-300">
            {dict.convertedTo} {bookingRequest.convertedBookingReference}
            <Link
              href={`/${tenantSlug}/admin/bookings/${bookingRequest.convertedBookingId}`}
              className="inline-flex items-center gap-1 underline"
            >
              {dict.viewBooking}
              <ExternalLink className="size-3.5" />
            </Link>
          </p>
        </div>
      )}

      {bookingRequest.status === "REJECTED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
          <p className="font-medium text-red-800 dark:text-red-300">
            {dict.rejectedOn} {formatDate(bookingRequest.rejectedAt)}
            {bookingRequest.rejectReason ? ` — ${bookingRequest.rejectReason}` : ""}
          </p>
        </div>
      )}

      {bookingRequest.status === "CANCELLED" && (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">
            {dict.cancelledOn} {formatDate(bookingRequest.cancelledAt)}
            {bookingRequest.cancelReason ? ` — ${bookingRequest.cancelReason}` : ""}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">{dict.requestedProduct}</h2>
            <dl className="space-y-2 text-sm">
              <Row label={dict.type} value={productTypeLabels[bookingRequest.productType]} />
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{dict.listing}</dt>
                <dd>
                  <Link
                    href={`/${tenantSlug}/${PRODUCT_PATH_SEGMENT[bookingRequest.productType]}/${bookingRequest.productSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline"
                  >
                    {bookingRequest.productName}
                    <ExternalLink className="size-3.5" />
                  </Link>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">{dict.contactSection}</h2>
            <dl className="space-y-2 text-sm">
              <Row label={dict.fullName} value={bookingRequest.fullName} />
              <Row label={common.email} value={bookingRequest.email} />
              <Row label={dict.phone} value={bookingRequest.phone ?? "—"} />
              <Row label={dict.whatsapp} value={bookingRequest.whatsapp ?? "—"} />
              {bookingRequest.customerId && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{dict.customerRecord}</dt>
                  <dd>
                    <Link
                      href={`/${tenantSlug}/admin/customers/${bookingRequest.customerId}`}
                      className="underline"
                    >
                      {bookingRequest.customerName}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">{dict.travelDetails}</h2>
            <dl className="space-y-2 text-sm">
              <Row label={dict.preferredDate} value={formatDate(bookingRequest.preferredDate)} />
              <Row label={dict.returnDate} value={formatDate(bookingRequest.returnDate)} />
              <Row
                label={dict.travelers}
                value={dict.travellersValue(bookingRequest.adults, bookingRequest.children)}
              />
            </dl>
          </section>

          {bookingRequest.notes && (
            <section>
              <h2 className="mb-1 text-sm font-medium">{dict.notesFromTraveler}</h2>
              <p className="text-muted-foreground rounded-lg border p-3 text-sm whitespace-pre-wrap">
                {bookingRequest.notes}
              </p>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">{dict.actions}</h2>
            {canEdit ? (
              <BookingRequestStatusActions
                tenantId={tenantId}
                tenantSlug={tenantSlug}
                bookingRequestId={bookingRequest.id}
                status={bookingRequest.status}
                email={bookingRequest.email}
                phone={bookingRequest.phone}
                whatsapp={bookingRequest.whatsapp}
                locale={locale}
              />
            ) : (
              <BookingRequestStatusBadge status={bookingRequest.status} />
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium">{dict.timeline}</h2>
            <ol className="space-y-2">
              {bookingRequest.activities.map((a) => (
                <li key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">{a.title}</p>
                  {a.description && (
                    <p className="text-muted-foreground text-xs whitespace-pre-wrap">{a.description}</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
