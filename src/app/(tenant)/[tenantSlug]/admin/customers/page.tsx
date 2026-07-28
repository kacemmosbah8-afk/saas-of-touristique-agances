import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listCustomers } from "@/features/crm/queries/list-customers.query";
import {
  listCustomersFiltersSchema,
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_LABELS,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
} from "@/features/crm/schemas/customer.schema";
import { CustomerList } from "@/features/crm/components/customer-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { RESOURCE_STATUS_OPTIONS } from "@/shared/lib/resource-status";
import { Button } from "@/shared/components/ui/button";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Customers" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CustomersPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "customer", "view");

  const filters = listCustomersFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    sort: raw.sort,
    page: raw.page,
    type: raw.type,
    source: raw.source,
  });

  const result = await listCustomers(db, filters);

  const canCreate = can(membership.role, "customer", "create");
  const canManage = can(membership.role, "customer", "manage");
  const canDelete = can(membership.role, "customer", "delete");
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).customers;
  const common = getAdminDictionary(locale).common;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{dict.pageTitle}</h1>
          <p className="text-muted-foreground text-sm">
            {result.total} {locale === "fr" ? "client(s)" : "عميل"} {common.inYourWorkspace}
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/admin/customers/new`}>
            <Button size="sm">
              <Plus className="me-1.5 size-4" />
              {dict.addCustomer}
            </Button>
          </Link>
        )}
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
              options: CUSTOMER_TYPES.map((t) => ({ value: t, label: CUSTOMER_TYPE_LABELS[t] })),
            },
            {
              key: "source",
              allLabel: dict.allSources,
              options: LEAD_SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABELS[s] })),
            },
          ]}
        />
      </Suspense>

      <CustomerList
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        customers={result.customers}
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
