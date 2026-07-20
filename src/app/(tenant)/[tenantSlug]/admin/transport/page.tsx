import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listTransport } from "@/features/transport/queries/list-transport.query";
import {
  listTransportFiltersSchema,
  TRANSPORT_TYPES,
  TRANSPORT_TYPE_LABELS,
} from "@/features/transport/schemas/transport.schema";
import { TransportList } from "@/features/transport/components/transport-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { RESOURCE_STATUS_OPTIONS } from "@/shared/lib/resource-status";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Transportation — TravelOS" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TransportPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "transport", "view");

  const filters = listTransportFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    sort: raw.sort,
    page: raw.page,
    type: raw.type,
  });

  const result = await listTransport(db, filters);

  const canCreate = can(membership.role, "transport", "create");
  const canManage = can(membership.role, "transport", "manage");
  const canDelete = can(membership.role, "transport", "delete");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transportation</h1>
          <p className="text-muted-foreground text-sm">
            {result.total} provider{result.total !== 1 ? "s" : ""} in your workspace
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/admin/transport/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Add Provider
            </Button>
          </Link>
        )}
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search providers…"
          filters={[
            { key: "status", allLabel: "All statuses", options: RESOURCE_STATUS_OPTIONS },
            {
              key: "type",
              allLabel: "All types",
              width: "w-[170px]",
              options: TRANSPORT_TYPES.map((t) => ({ value: t, label: TRANSPORT_TYPE_LABELS[t] })),
            },
          ]}
        />
      </Suspense>

      <TransportList
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        providers={result.providers}
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
          noun="provider"
        />
      </Suspense>
    </div>
  );
}
