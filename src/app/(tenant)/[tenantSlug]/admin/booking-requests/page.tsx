import { notFound } from "next/navigation";
import { Suspense } from "react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { listBookingRequests } from "@/features/booking-requests/queries/list-booking-requests.query";
import { listBookingRequestsFiltersSchema } from "@/features/booking-requests/schemas/booking-request.schema";
import {
  BOOKING_REQUEST_STATUSES,
  BOOKING_REQUEST_STATUS_LABELS,
} from "@/features/booking-requests/lib/status";
import { BOOKING_REQUEST_PRODUCT_TYPES } from "@/features/booking-requests/schemas/booking-request.schema";
import { BookingRequestList } from "@/features/booking-requests/components/booking-request-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";

export const metadata = { title: "Booking Requests — TravelOS" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PRODUCT_TYPE_LABELS: Record<(typeof BOOKING_REQUEST_PRODUCT_TYPES)[number], string> = {
  PACKAGE: "Package",
  HOTEL: "Hotel",
  DESTINATION: "Destination",
  ACTIVITY: "Activity",
  FLIGHT: "Flight",
};

export default async function BookingRequestsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "bookingRequest", "view");

  const filters = listBookingRequestsFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    productType: raw.productType,
    sort: raw.sort,
    page: raw.page,
  });

  const { bookingRequests, total, page, pageSize, pageCount, statusCounts } =
    await listBookingRequests(db, filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Booking Requests</h1>
        <p className="text-muted-foreground text-sm">
          {total} total · {statusCounts.PENDING ?? 0} pending · {statusCounts.CONTACTED ?? 0} contacted ·{" "}
          {statusCounts.CONFIRMED ?? 0} confirmed
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {BOOKING_REQUEST_STATUSES.map((s) => (
          <div key={s} className="rounded-lg border p-3">
            <p className="text-xl font-semibold tabular-nums">{statusCounts[s] ?? 0}</p>
            <p className="text-muted-foreground text-xs">{BOOKING_REQUEST_STATUS_LABELS[s]}</p>
          </div>
        ))}
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search name, email, reference…"
          filters={[
            {
              key: "status",
              allLabel: "All statuses",
              options: BOOKING_REQUEST_STATUSES.map((s) => ({
                value: s,
                label: BOOKING_REQUEST_STATUS_LABELS[s],
              })),
            },
            {
              key: "productType",
              allLabel: "All product types",
              options: BOOKING_REQUEST_PRODUCT_TYPES.map((t) => ({
                value: t,
                label: PRODUCT_TYPE_LABELS[t],
              })),
            },
          ]}
        />
      </Suspense>

      <BookingRequestList tenantSlug={tenantSlug} bookingRequests={bookingRequests} />

      <DataPagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        noun="request"
      />
    </div>
  );
}
