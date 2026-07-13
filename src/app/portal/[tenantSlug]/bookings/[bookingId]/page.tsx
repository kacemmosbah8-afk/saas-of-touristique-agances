import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText, Users } from "lucide-react";

import { requirePortalSession } from "@/features/portal/lib/guard";
import { getPortalBookingDetail } from "@/features/portal/queries/booking-detail.query";
import { BookingTimeline } from "@/features/portal/components/booking-timeline";
import { formatDate, formatMoney } from "@/features/portal/lib/format";
import { BOOKING_STATUS_LABELS } from "@/features/bookings/lib/status";
import { BOOKING_ITEM_TYPE_LABELS } from "@/features/bookings/schemas/booking.schema";
import { SUPPLIER_ORDER_STATUS_LABELS } from "@/features/supplier-execution/lib/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Trip details" };

type PageProps = { params: Promise<{ tenantSlug: string; bookingId: string }> };

export default async function PortalBookingPage({ params }: PageProps) {
  const { tenantSlug, bookingId } = await params;
  const ctx = await requirePortalSession(tenantSlug);

  const trip = await getPortalBookingDetail(ctx.db, ctx.tenantId, ctx.customerId, bookingId);
  if (!trip) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/portal/${tenantSlug}/dashboard`}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Your trips
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{trip.reference}</h1>
            <p className="text-muted-foreground text-sm">
              {trip.travelStartDate ? formatDate(trip.travelStartDate) : "Dates to be confirmed"}
              {trip.travelEndDate ? ` – ${formatDate(trip.travelEndDate)}` : ""}
            </p>
          </div>
          <Badge variant="outline">{BOOKING_STATUS_LABELS[trip.status]}</Badge>
        </div>
      </div>

      {trip.status === "CANCELLED" && trip.cancelReason && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          This booking was cancelled. {trip.cancelReason}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Trip items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trip.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="text-muted-foreground text-xs">
                    {BOOKING_ITEM_TYPE_LABELS[item.type]}
                    {item.confirmationNumber ? ` · Confirmation #${item.confirmationNumber}` : ""}
                  </p>
                  {item.supplierStatus && (
                    <Badge variant="outline" className="mt-1 text-[11px]">
                      {SUPPLIER_ORDER_STATUS_LABELS[item.supplierStatus]}
                    </Badge>
                  )}
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums">
                  {formatMoney(item.amount, item.currency)}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
              <span>Total</span>
              <span>{formatMoney(trip.total, trip.currency)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Travellers</CardTitle>
              <Users className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent className="space-y-2">
              {trip.travellers.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span>
                    {t.firstName} {t.lastName}
                    {t.isPrimary && <span className="text-muted-foreground"> (lead)</span>}
                  </span>
                  <span className="text-muted-foreground text-xs">{t.type}</span>
                </div>
              ))}
              {trip.travellers.length === 0 && (
                <p className="text-muted-foreground text-sm">No travellers on file yet.</p>
              )}
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" asChild>
            <Link href={`/portal/${tenantSlug}/bookings/${bookingId}/documents`}>
              <FileText className="mr-1.5 size-4" />
              Documents
            </Link>
          </Button>
        </div>
      </div>

      {trip.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{trip.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trip timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingTimeline entries={trip.timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
