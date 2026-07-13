import Link from "next/link";
import { ChevronLeft, QrCode } from "lucide-react";

import type { VoucherDetail } from "@/features/vouchers/queries/voucher.query";
import { BOOKING_ITEM_TYPE_LABELS } from "@/features/bookings/schemas/booking.schema";
import { formatDate } from "@/features/portal/lib/format";

/**
 * Portal-scoped rendering of the same printable voucher staff see —
 * deliberately not a reuse of `features/vouchers/components/voucher-view.tsx`
 * as-is, since that component's "back" link points at the staff booking
 * dashboard (`/${tenantSlug}/bookings/...`), which a traveler has no
 * session for. Markup and styling otherwise match it exactly: this is the
 * document a traveler hands to a hotel/guide/driver, and it should look
 * identical regardless of who's viewing it.
 */
export function PortalVoucherView({
  tenantSlug,
  bookingId,
  voucher,
}: {
  tenantSlug: string;
  bookingId: string;
  voucher: VoucherDetail;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="print:hidden">
        <Link
          href={`/portal/${tenantSlug}/bookings/${bookingId}/documents`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Back to documents
        </Link>
      </div>

      <div className="rounded-xl border-2 p-6">
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Service voucher</p>
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
              {voucher.status === "ISSUED" ? "VALID" : "CANCELLED"}
            </p>
          </div>
        </div>

        {voucher.status === "CANCELLED" && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            This voucher was cancelled on {formatDate(voucher.cancelledAt)} and must not be honoured.
          </p>
        )}

        <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto]">
          <dl className="space-y-2.5 text-sm">
            <Row label="Service" value={voucher.serviceDescription} />
            {voucher.supplierName && <Row label="Supplier" value={voucher.supplierName} />}
            {voucher.confirmationNumber && <Row label="Confirmation #" value={voucher.confirmationNumber} />}
            <Row label="Booking reference" value={voucher.bookingReference} />
            <Row label="Lead customer" value={voucher.customerName} />
            <Row label="From" value={formatDate(voucher.serviceStartDate)} />
            <Row label="To" value={formatDate(voucher.serviceEndDate)} />
            <div>
              <dt className="text-muted-foreground">Travellers</dt>
              <dd>
                <ul className="mt-0.5 list-inside list-disc">
                  {voucher.travellerNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </dd>
            </div>
            {voucher.notes && <Row label="Notes" value={voucher.notes} />}
          </dl>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex size-32 items-center justify-center rounded-lg border-2 border-dashed">
              <QrCode className="text-muted-foreground size-16" strokeWidth={1} />
            </div>
            <p className="text-muted-foreground max-w-32 text-center text-[10px] break-all">{voucher.qrData}</p>
          </div>
        </div>

        <p className="text-muted-foreground mt-6 border-t pt-3 text-xs">
          Issued {formatDate(voucher.issuedAt)} by {voucher.agencyName}. Present this voucher to the supplier at
          check-in / service start.
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
