import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getBooking } from "@/features/bookings/queries/get-booking.query";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { listInvoicesForBooking } from "@/features/invoices/queries/booking-invoices.query";
import { BookingDetail } from "@/features/bookings/components/booking-detail";

export const metadata = { title: "Booking — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; bookingId: string }> };

export default async function BookingDetailPage({ params }: PageProps) {
  const { tenantSlug, bookingId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "booking", "view");

  const [booking, members, invoices] = await Promise.all([
    getBooking(db, tenant.id, bookingId),
    getMemberOptions(tenant.id),
    listInvoicesForBooking(db, bookingId),
  ]);
  if (!booking) notFound();

  return (
    <BookingDetail
      tenantId={tenant.id}
      tenantSlug={tenantSlug}
      booking={booking}
      members={members}
      canEdit={can(membership.role, "booking", "update")}
      invoices={invoices}
      canCreateInvoice={can(membership.role, "invoice", "create")}
    />
  );
}
