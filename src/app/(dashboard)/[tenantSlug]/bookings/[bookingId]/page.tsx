import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getBooking } from "@/features/bookings/queries/get-booking.query";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { listInvoicesForBooking } from "@/features/invoices/queries/booking-invoices.query";
import { listBookingTravellers } from "@/features/travellers/queries/booking-travellers.query";
import { listDocumentsForOwner } from "@/features/documents/queries/owner-documents.query";
import {
  listCancellationPolicies,
  getBookingCancellation,
} from "@/features/cancellations/queries/cancellation.query";
import { listBookingConfirmations } from "@/features/confirmations/queries/booking-confirmations.query";
import { listBookingVouchers } from "@/features/vouchers/queries/voucher.query";
import { listSupplierOrders } from "@/features/supplier-execution/queries/list-supplier-orders.query";
import type { DocumentSummary } from "@/features/documents/queries/list-documents.query";
import { BookingDetail } from "@/features/bookings/components/booking-detail";

export const metadata = { title: "Booking — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; bookingId: string }> };

export default async function BookingDetailPage({ params }: PageProps) {
  const { tenantSlug, bookingId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "booking", "view");

  const [
    booking,
    members,
    invoices,
    travellers,
    policies,
    cancellation,
    confirmables,
    vouchers,
    supplierOrders,
  ] = await Promise.all([
    getBooking(db, tenant.id, bookingId),
    getMemberOptions(tenant.id),
    listInvoicesForBooking(db, bookingId),
    listBookingTravellers(db, tenant.id, bookingId),
    listCancellationPolicies(db),
    getBookingCancellation(db, tenant.id, bookingId),
    listBookingConfirmations(db, bookingId),
    listBookingVouchers(db, bookingId),
    listSupplierOrders(db, bookingId),
  ]);
  if (!booking) notFound();

  // Traveller document scans, grouped by traveller (polymorphic Document).
  const documentsByTraveller: Record<string, DocumentSummary[]> = {};
  await Promise.all(
    travellers.map(async (t) => {
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
      invoices={invoices}
      canCreateInvoice={can(membership.role, "invoice", "create")}
      travellers={travellers}
      documentsByTraveller={documentsByTraveller}
      cancellationPolicies={policies}
      cancellationRecord={cancellation}
      confirmables={confirmables}
      vouchers={vouchers}
      supplierOrders={supplierOrders}
      canManage={can(membership.role, "booking", "manage")}
    />
  );
}
