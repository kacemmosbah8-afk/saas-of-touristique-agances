import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import {
  listBookings,
  getBookingStats,
} from "@/features/bookings/queries/list-bookings.query";
import { listBookingsFiltersSchema } from "@/features/bookings/schemas/booking.schema";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS } from "@/features/bookings/lib/status";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { BookingList } from "@/features/bookings/components/booking-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Bookings — TravelOS" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BookingsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "booking", "view");

  const filters = listBookingsFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    owner: raw.owner,
    sort: raw.sort,
    page: raw.page,
  });

  const [{ bookings, total, page, pageSize, pageCount }, stats, members] = await Promise.all([
    listBookings(db, filters),
    getBookingStats(db),
    getMemberOptions(tenant.id),
  ]);

  const canCreate = can(membership.role, "booking", "create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Bookings</h1>
          <p className="text-muted-foreground text-sm">
            {stats.total} total · {stats.byStatus.CONFIRMED + stats.byStatus.IN_PROGRESS} active ·{" "}
            {stats.upcoming} upcoming
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/bookings/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              New Booking
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active revenue" value={stats.activeRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
        <StatCard label="Confirmed" value={stats.byStatus.CONFIRMED} />
        <StatCard label="In progress" value={stats.byStatus.IN_PROGRESS} />
        <StatCard label="Completed" value={stats.byStatus.COMPLETED} />
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search reference or customer…"
          filters={[
            {
              key: "status",
              allLabel: "All statuses",
              options: BOOKING_STATUSES.map((s) => ({ value: s, label: BOOKING_STATUS_LABELS[s] })),
            },
            {
              key: "owner",
              allLabel: "All agents",
              width: "w-[170px]",
              options: members.map((m) => ({ value: m.userId, label: m.name })),
            },
          ]}
        />
      </Suspense>

      <BookingList tenantSlug={tenantSlug} bookings={bookings} canCreate={canCreate} />

      <DataPagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        noun="booking"
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
