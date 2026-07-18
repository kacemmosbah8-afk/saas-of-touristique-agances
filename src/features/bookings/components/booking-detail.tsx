import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import type { BookingDetail as BookingDetailData } from "@/features/bookings/queries/get-booking.query";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";
import type { TravellerView } from "@/features/travellers/queries/booking-travellers.query";
import type { DocumentSummary } from "@/features/documents/queries/list-documents.query";
import type { ConfirmableItem } from "@/features/confirmations/queries/booking-confirmations.query";
import type { VoucherSummary } from "@/features/vouchers/queries/voucher.query";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { BookingStatusActions } from "@/features/bookings/components/booking-status-actions";
import { BookingItemsEditor } from "@/features/bookings/components/booking-items-editor";
import { TravellersSection } from "@/features/travellers/components/travellers-section";
import { ConfirmationsSection } from "@/features/confirmations/components/confirmations-section";
import { VouchersSection } from "@/features/vouchers/components/vouchers-section";
import { isTerminal } from "@/features/bookings/lib/status";

type Props = {
  tenantId: string;
  tenantSlug: string;
  booking: BookingDetailData;
  members: MemberOption[];
  canEdit: boolean;
  travellers: TravellerView[];
  documentsByTraveller: Record<string, DocumentSummary[]>;
  confirmables: ConfirmableItem[];
  vouchers: VoucherSummary[];
};

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(date: Date | null): string {
  return date ? new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";
}

export function BookingDetail({
  tenantId,
  tenantSlug,
  booking,
  members,
  canEdit,
  travellers,
  documentsByTraveller,
  confirmables,
  vouchers,
}: Props) {
  const ownerName = members.find((m) => m.userId === booking.ownerId)?.name ?? null;
  const editable = canEdit && !isTerminal(booking.status);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/bookings`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Bookings
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tabular-nums">{booking.reference}</h1>
          <BookingStatusBadge status={booking.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {booking.customerName}
          {booking.packageName ? ` · ${booking.packageName}` : ""}
        </p>
      </div>

      {booking.status === "CANCELLED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950">
          <p className="font-medium text-red-800 dark:text-red-300">
            Cancelled on {formatDate(booking.cancelledAt)}
          </p>
          {booking.cancelReason && (
            <p className="mt-0.5 text-red-700 dark:text-red-400">{booking.cancelReason}</p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-2 text-sm font-medium">Line items</h2>
            <BookingItemsEditor
              tenantId={tenantId}
              bookingId={booking.id}
              items={booking.items}
              currency={booking.currency}
              editable={editable}
            />
          </section>

          <section className="rounded-lg border p-4">
            <dl className="ml-auto max-w-xs space-y-1.5 text-sm">
              <Row label="Subtotal" value={money(booking.subtotal, booking.currency)} />
              <Row label="Discount" value={`− ${money(booking.discount, booking.currency)}`} />
              <Row label="Tax" value={money(booking.tax, booking.currency)} />
              <div className="border-t pt-1.5">
                <Row label="Total" value={money(booking.total, booking.currency)} strong />
              </div>
            </dl>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium">Travellers</h2>
            <TravellersSection
              tenantId={tenantId}
              bookingId={booking.id}
              travellers={travellers}
              documentsByTraveller={documentsByTraveller}
              editable={editable}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium">Supplier confirmations</h2>
            <ConfirmationsSection
              tenantId={tenantId}
              bookingId={booking.id}
              items={confirmables}
              editable={editable}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium">Vouchers</h2>
            <VouchersSection
              tenantId={tenantId}
              tenantSlug={tenantSlug}
              bookingId={booking.id}
              vouchers={vouchers}
              items={booking.items}
              canIssue={
                canEdit &&
                booking.status !== "DRAFT" &&
                booking.status !== "CANCELLED" &&
                travellers.length > 0
              }
            />
          </section>

          {(booking.notes || booking.internalNotes) && (
            <section className="space-y-3">
              {booking.notes && (
                <div>
                  <h2 className="mb-1 text-sm font-medium">Customer-facing notes</h2>
                  <p className="text-muted-foreground rounded-lg border p-3 text-sm whitespace-pre-wrap">
                    {booking.notes}
                  </p>
                </div>
              )}
              {booking.internalNotes && (
                <div>
                  <h2 className="mb-1 text-sm font-medium">Internal notes</h2>
                  <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm whitespace-pre-wrap">
                    {booking.internalNotes}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">Details</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Travel start" value={formatDate(booking.travelStartDate)} />
              <Row label="Travel end" value={formatDate(booking.travelEndDate)} />
              <Row label="Travellers" value={`${booking.adults} adult(s), ${booking.children} child(ren)`} />
              <Row label="Agent" value={ownerName ?? "Unassigned"} />
              <Row label="Created" value={formatDate(booking.createdAt)} />
            </dl>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-medium">Status</h2>
            {canEdit ? (
              <BookingStatusActions
                tenantId={tenantId}
                bookingId={booking.id}
                status={booking.status}
                ownerId={booking.ownerId}
                members={members}
                canEdit={canEdit}
              />
            ) : (
              <BookingStatusBadge status={booking.status} />
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium">Timeline</h2>
            <ol className="space-y-2">
              {booking.activities.map((a) => (
                <li key={a.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">{a.title}</p>
                  {a.description && (
                    <p className="text-muted-foreground text-xs">{a.description}</p>
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
