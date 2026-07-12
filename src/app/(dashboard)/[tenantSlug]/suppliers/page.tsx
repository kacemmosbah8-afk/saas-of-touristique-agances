import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listSuppliers } from "@/features/suppliers/queries/list-suppliers.query";
import {
  listSuppliersFiltersSchema,
  SUPPLIER_TYPES,
  SUPPLIER_TYPE_LABELS,
} from "@/features/suppliers/schemas/supplier.schema";
import { SupplierList } from "@/features/suppliers/components/supplier-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { RESOURCE_STATUS_OPTIONS } from "@/shared/lib/resource-status";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Suppliers — TravelOS" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuppliersPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "supplier", "view");

  const filters = listSuppliersFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    sort: raw.sort,
    page: raw.page,
    type: raw.type,
  });

  const result = await listSuppliers(db, filters);

  const canCreate = can(membership.role, "supplier", "create");
  const canManage = can(membership.role, "supplier", "manage");
  const canDelete = can(membership.role, "supplier", "delete");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Suppliers</h1>
          <p className="text-muted-foreground text-sm">
            {result.total} supplier{result.total !== 1 ? "s" : ""} in your workspace
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/suppliers/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Add Supplier
            </Button>
          </Link>
        )}
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search suppliers…"
          filters={[
            { key: "status", allLabel: "All statuses", options: RESOURCE_STATUS_OPTIONS },
            {
              key: "type",
              allLabel: "All types",
              options: SUPPLIER_TYPES.map((t) => ({ value: t, label: SUPPLIER_TYPE_LABELS[t] })),
            },
          ]}
        />
      </Suspense>

      <SupplierList
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        suppliers={result.suppliers}
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
          noun="supplier"
        />
      </Suspense>
    </div>
  );
}
