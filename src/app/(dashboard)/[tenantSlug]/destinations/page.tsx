import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listDestinations } from "@/features/destinations/queries/list-destinations.query";
import { listDestinationsFiltersSchema } from "@/features/destinations/schemas/destination.schema";
import { DestinationList } from "@/features/destinations/components/destination-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { RESOURCE_STATUS_OPTIONS } from "@/shared/lib/resource-status";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Destinations — TravelOS" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DestinationsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "destination", "view");

  const filters = listDestinationsFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    sort: raw.sort,
    page: raw.page,
  });

  const result = await listDestinations(db, filters);

  const canCreate = can(membership.role, "destination", "create");
  const canManage = can(membership.role, "destination", "manage");
  const canDelete = can(membership.role, "destination", "delete");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Destinations</h1>
          <p className="text-muted-foreground text-sm">
            {result.total} destination{result.total !== 1 ? "s" : ""} in your workspace
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/destinations/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Add Destination
            </Button>
          </Link>
        )}
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search destinations…"
          filters={[{ key: "status", allLabel: "All statuses", options: RESOURCE_STATUS_OPTIONS }]}
        />
      </Suspense>

      <DestinationList
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        destinations={result.destinations}
        canCreate={canCreate}
        canManage={canManage}
        canDelete={canDelete}
      />

      <Suspense>
        <DataPagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={result.pageSize}
          noun="destination"
        />
      </Suspense>
    </div>
  );
}
