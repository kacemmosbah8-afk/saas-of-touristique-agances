import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listFlights } from "@/features/flights/queries/list-flights.query";
import { listFlightsFiltersSchema } from "@/features/flights/schemas/flight.schema";
import { FlightList } from "@/features/flights/components/flight-list";
import { FlightFilterBar } from "@/features/flights/components/flight-filter-bar";
import { FlightPagination } from "@/features/flights/components/flight-pagination";
import { Button } from "@/shared/components/ui/button";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Flights" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FlightsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const rawSearch = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "flight", "view");

  const filters = listFlightsFiltersSchema.parse({
    search: rawSearch.search,
    status: rawSearch.status,
    sort: rawSearch.sort,
    page: rawSearch.page,
  });

  const result = await listFlights(db, filters);

  const canCreate = can(membership.role, "flight", "create");
  const canManage = can(membership.role, "flight", "manage");
  const canDelete = can(membership.role, "flight", "delete");
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).flights;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{dict.pageTitle}</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {dict.pageSubtitleIntro} {dict.pageSubtitleCount(result.total)}
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/admin/flights/new`}>
            <Button size="sm">
              <Plus className="me-1.5 size-4" />
              {dict.addFlight}
            </Button>
          </Link>
        )}
      </div>

      <Suspense>
        <FlightFilterBar locale={locale} />
      </Suspense>

      <FlightList
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        flights={result.flights}
        canCreate={canCreate}
        canManage={canManage}
        canDelete={canDelete}
        locale={locale}
      />

      <Suspense>
        <FlightPagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
          locale={locale}
        />
      </Suspense>
    </div>
  );
}
