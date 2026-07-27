import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listSuppliers } from "@/features/suppliers/queries/list-suppliers.query";
import { getSupplierStats } from "@/features/suppliers/queries/get-supplier.query";
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
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Suppliers" };

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

  const [result, stats] = await Promise.all([
    listSuppliers(db, filters),
    getSupplierStats(db),
  ]);

  const canCreate = can(membership.role, "supplier", "create");
  const canManage = can(membership.role, "supplier", "manage");
  const canDelete = can(membership.role, "supplier", "delete");
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).suppliers;
  const common = getAdminDictionary(locale).common;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{dict.pageTitle}</h1>
          <p className="text-muted-foreground text-sm">{dict.pageSubtitleCount(result.total)}</p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/admin/suppliers/new`}>
            <Button size="sm">
              <Plus className="me-1.5 size-4" />
              {dict.addSupplier}
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xl font-semibold tabular-nums">{stats.total}</p>
          <p className="text-muted-foreground text-xs">{dict.statTotalSuppliers}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xl font-semibold tabular-nums">{stats.active}</p>
          <p className="text-muted-foreground text-xs">{dict.statActive}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xl font-semibold tabular-nums">
            {stats.averageRating != null ? stats.averageRating.toFixed(1) : "—"}
          </p>
          <p className="text-muted-foreground text-xs">{dict.statAvgRating}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="truncate text-xl font-semibold">
            {stats.byType[0] ? SUPPLIER_TYPE_LABELS[stats.byType[0].type] : "—"}
          </p>
          <p className="text-muted-foreground text-xs">{dict.statTopCategory}</p>
        </div>
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder={dict.searchPlaceholder}
          locale={locale}
          filters={[
            { key: "status", allLabel: common.allStatuses, options: RESOURCE_STATUS_OPTIONS },
            {
              key: "type",
              allLabel: dict.allTypes,
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
        locale={locale}
      />

      <Suspense>
        <DataPagination
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
