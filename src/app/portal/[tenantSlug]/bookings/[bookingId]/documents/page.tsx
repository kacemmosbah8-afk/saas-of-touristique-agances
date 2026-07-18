import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, Ticket } from "lucide-react";

import { requirePortalSession } from "@/features/portal/lib/guard";
import { getPortalBookingDetail } from "@/features/portal/queries/booking-detail.query";
import { listPortalBookingDocuments } from "@/features/portal/queries/documents.query";
import { formatDate } from "@/features/portal/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

export const metadata = { title: "Trip documents" };

type PageProps = { params: Promise<{ tenantSlug: string; bookingId: string }> };

export default async function PortalDocumentsPage({ params }: PageProps) {
  const { tenantSlug, bookingId } = await params;
  const ctx = await requirePortalSession(tenantSlug);

  // Both queries independently re-verify booking ownership (tenantId +
  // customerId) — this page can never be reached for a booking that isn't
  // this customer's, even by a direct URL guess, regardless of which of
  // the two calls below runs first.
  const trip = await getPortalBookingDetail(ctx.db, ctx.tenantId, ctx.customerId, bookingId);
  if (!trip) notFound();

  const docs = await listPortalBookingDocuments(ctx.db, ctx.tenantId, ctx.customerId, bookingId);
  if (!docs) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/portal/${tenantSlug}/bookings/${bookingId}`}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          {trip.reference}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vouchers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {docs.vouchers.map((v) => (
            <Link
              key={v.id}
              href={`/portal/${tenantSlug}/bookings/${bookingId}/vouchers/${v.id}`}
              className="hover:bg-accent flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Ticket className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{v.serviceDescription}</p>
                  <p className="text-muted-foreground text-xs">Issued {formatDate(v.issuedAt)}</p>
                </div>
              </div>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{v.reference}</span>
            </Link>
          ))}
          {docs.vouchers.length === 0 && <p className="text-muted-foreground text-sm">No vouchers issued yet.</p>}
        </CardContent>
      </Card>

      {docs.files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Other files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {docs.files.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:bg-accent flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Download className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  <p className="truncate font-medium">{f.name}</p>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">{formatDate(f.createdAt)}</span>
              </a>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
