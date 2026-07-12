import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listActivities } from "@/features/activities/queries/list-activities.query";
import { listActivitiesFiltersSchema } from "@/features/activities/schemas/activity.schema";
import { ActivityList } from "@/features/activities/components/activity-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { RESOURCE_STATUS_OPTIONS } from "@/shared/lib/resource-status";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Activities — TravelOS" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ActivitiesPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "activity", "view");

  const filters = listActivitiesFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    sort: raw.sort,
    page: raw.page,
  });

  const result = await listActivities(db, filters);

  const canCreate = can(membership.role, "activity", "create");
  const canManage = can(membership.role, "activity", "manage");
  const canDelete = can(membership.role, "activity", "delete");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Activities</h1>
          <p className="text-muted-foreground text-sm">
            {result.total} activit{result.total !== 1 ? "ies" : "y"} in your workspace
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/activities/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Add Activity
            </Button>
          </Link>
        )}
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search activities…"
          filters={[{ key: "status", allLabel: "All statuses", options: RESOURCE_STATUS_OPTIONS }]}
        />
      </Suspense>

      <ActivityList
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        activities={result.activities}
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
          noun="activity"
          nounPlural="activities"
        />
      </Suspense>
    </div>
  );
}
