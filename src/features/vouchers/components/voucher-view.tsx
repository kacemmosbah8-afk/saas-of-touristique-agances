import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import type { VoucherDetail } from "@/features/vouchers/queries/voucher.query";
import { BOOKING_ITEM_TYPE_LABELS } from "@/features/bookings/schemas/booking.schema";
import { renderVoucherQrSvg } from "@/features/vouchers/lib/qr";
import { type Locale } from "@/shared/i18n/dictionary";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

function formatDate(date: Date | null): string {
  return date ? new Date(date).toLocaleDateString(undefined, { dateStyle: "long" }) : "—";
}

/**
 * The printable voucher. Deliberately plain, high-contrast markup — this
 * page is what the customer hands to the hotel/guide/driver.
 */
export async function VoucherView({
  tenantSlug,
  voucher,
  locale,
}: {
  tenantSlug: string;
  voucher: VoucherDetail;
  locale: Locale;
}) {
  const dict = getAdminDictionary(locale).vouchers;
  const common = getAdminDictionary(locale).common;
  const qrSvg = await renderVoucherQrSvg(voucher.qrData);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="print:hidden">
        <Link
          href={`/${tenantSlug}/admin/bookings/${voucher.bookingId}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.backToBooking}
        </Link>
      </div>

      <div className="rounded-xl border-2 p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              {dict.serviceVoucherLabel}
            </p>
            <h1 className="text-2xl font-semibold tabular-nums">{voucher.reference}</h1>
            <p className="text-muted-foreground text-sm">{voucher.agencyName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{BOOKING_ITEM_TYPE_LABELS[voucher.type]}</p>
            <p
              className={
                voucher.status === "ISSUED"
                  ? "text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                  : "text-sm font-semibold text-red-600 dark:text-red-400"
              }
            >
              {voucher.status === "ISSUED" ? dict.valid : dict.cancelledLabel}
            </p>
          </div>
        </div>

        {voucher.status === "CANCELLED" && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {dict.cancelledNotice(formatDate(voucher.cancelledAt))}
          </p>
        )}

        <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto]">
          <dl className="space-y-2.5 text-sm">
            <Row label={dict.service} value={voucher.serviceDescription} />
            {voucher.supplierName && <Row label={dict.supplier} value={voucher.supplierName} />}
            {voucher.confirmationNumber && (
              <Row label={dict.confirmationNumber} value={voucher.confirmationNumber} />
            )}
            <Row label={dict.bookingReference} value={voucher.bookingReference} />
            <Row label={dict.leadCustomer} value={voucher.customerName} />
            <Row label={dict.from} value={formatDate(voucher.serviceStartDate)} />
            <Row label={dict.to} value={formatDate(voucher.serviceEndDate)} />
            <div>
              <dt className="text-muted-foreground">{dict.travellers}</dt>
              <dd>
                <ul className="mt-0.5 list-inside list-disc">
                  {voucher.travellerNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </dd>
            </div>
            {voucher.notes && <Row label={common.notes} value={voucher.notes} />}
          </dl>

          <div className="flex flex-col items-center gap-1.5">
            <div
              className="flex size-32 items-center justify-center rounded-lg border-2 p-2 [&_svg]:h-full [&_svg]:w-full"
              // Trusted, server-generated SVG (path data only, no user text).
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="text-muted-foreground max-w-32 text-center text-[10px] break-all">
              {voucher.reference}
            </p>
          </div>
        </div>

        <p className="text-muted-foreground mt-6 border-t pt-3 text-xs">
          {dict.issuedByFooter(formatDate(voucher.issuedAt), voucher.agencyName)}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
