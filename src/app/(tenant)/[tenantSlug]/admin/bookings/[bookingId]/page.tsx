import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getBooking } from "@/features/bookings/queries/get-booking.query";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { listBookingTravellers } from "@/features/travellers/queries/booking-travellers.query";
import { listDocumentsForOwner } from "@/features/documents/queries/owner-documents.query";
import { listBookingConfirmations } from "@/features/confirmations/queries/booking-confirmations.query";
import { listBookingVouchers } from "@/features/vouchers/queries/voucher.query";
import { getSupplierOptions } from "@/features/suppliers/queries/supplier-options.query";
import type { DocumentSummary } from "@/features/documents/queries/list-documents.query";
import { BookingDetail } from "@/features/bookings/components/booking-detail";

export const metadata = { title: "Booking — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; bookingId: string }> };

export default async function BookingDetailPage({ params }: PageProps) {
  const { tenantSlug, bookingId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "booking", "view");

  const [booking, members, travellers, confirmables, vouchers, suppliers] = await Promise.all([
    getBooking(db, tenant.id, bookingId),
    getMemberOptions(tenant.id),
    listBookingTravellers(db, tenant.id, bookingId),
    listBookingConfirmations(db, bookingId),
    listBookingVouchers(db, bookingId),
    getSupplierOptions(db),
  ]);
  if (!booking) notFound();

  // Traveller document scans, grouped by traveller (polymorphic Document).
  const documentsByTraveller: Record<string, DocumentSummary[]> = {};
  await Promise.all(
    travellers.map(async (t: { id: string }) => {
      documentsByTraveller[t.id] = await listDocumentsForOwner(db, "traveller", t.id);
    }),
  );

  return (
    <BookingDetail
      tenantId={tenant.id}
      tenantSlug={tenantSlug}
      booking={booking}
      members={members}
      canEdit={can(membership.role, "booking", "update")}
      travellers={travellers}
      documentsByTraveller={documentsByTraveller}
      confirmables={confirmables}
      vouchers={vouchers}
      suppliers={suppliers}
    />
  );
}
