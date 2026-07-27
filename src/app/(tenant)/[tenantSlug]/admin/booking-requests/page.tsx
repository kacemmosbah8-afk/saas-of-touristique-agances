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
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Booking Requests" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PRODUCT_TYPE_LABELS_AR: Record<(typeof BOOKING_REQUEST_PRODUCT_TYPES)[number], string> = {
  PACKAGE: "باقة",
  HOTEL: "فندق",
  DESTINATION: "وجهة",
  ACTIVITY: "نشاط",
  FLIGHT: "رحلة جوية",
};
const PRODUCT_TYPE_LABELS_FR: Record<(typeof BOOKING_REQUEST_PRODUCT_TYPES)[number], string> = {
  PACKAGE: "Forfait",
  HOTEL: "Hôtel",
  DESTINATION: "Destination",
  ACTIVITY: "Activité",
  FLIGHT: "Vol",
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
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).bookingRequests;
  const productTypeLabels = locale === "fr" ? PRODUCT_TYPE_LABELS_FR : PRODUCT_TYPE_LABELS_AR;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{dict.pageTitle}</h1>
        <p className="text-muted-foreground text-sm">{dict.pageSubtitle}</p>
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
          searchPlaceholder={dict.searchPlaceholder}
          locale={locale}
          filters={[
            {
              key: "status",
              allLabel: dict.allStatuses,
              options: BOOKING_REQUEST_STATUSES.map((s) => ({
                value: s,
                label: BOOKING_REQUEST_STATUS_LABELS[s],
              })),
            },
            {
              key: "productType",
              allLabel: dict.allProductTypes,
              options: BOOKING_REQUEST_PRODUCT_TYPES.map((t) => ({
                value: t,
                label: productTypeLabels[t],
              })),
            },
          ]}
        />
      </Suspense>

      <BookingRequestList tenantSlug={tenantSlug} bookingRequests={bookingRequests} locale={locale} />

      <DataPagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        locale={locale}
      />
    </div>
  );
}
