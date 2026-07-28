import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getBookingRequest } from "@/features/booking-requests/queries/get-booking-request.query";
import { BookingRequestDetail } from "@/features/booking-requests/components/booking-request-detail";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";

export const metadata = { title: "Booking Request" };

type PageProps = { params: Promise<{ tenantSlug: string; bookingRequestId: string }> };

export default async function BookingRequestDetailPage({ params }: PageProps) {
  const { tenantSlug, bookingRequestId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "bookingRequest", "view");

  const bookingRequest = await getBookingRequest(db, tenant.id, bookingRequestId);
  if (!bookingRequest) notFound();
  const locale = await getVisitorLocale();

  return (
    <BookingRequestDetail
      tenantId={tenant.id}
      tenantSlug={tenantSlug}
      bookingRequest={bookingRequest}
      canEdit={can(membership.role, "bookingRequest", "update")}
      locale={locale}
    />
  );
}
