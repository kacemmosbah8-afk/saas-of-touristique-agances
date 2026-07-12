import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listCompanies } from "@/features/crm/queries/list-companies.query";
import { listCompaniesFiltersSchema } from "@/features/crm/schemas/company.schema";
import { CompanyList } from "@/features/crm/components/company-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { RESOURCE_STATUS_OPTIONS } from "@/shared/lib/resource-status";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Companies — TravelOS" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CompaniesPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "company", "view");

  const filters = listCompaniesFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    sort: raw.sort,
    page: raw.page,
  });

  const result = await listCompanies(db, filters);

  const canCreate = can(membership.role, "company", "create");
  const canManage = can(membership.role, "company", "manage");
  const canDelete = can(membership.role, "company", "delete");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Companies</h1>
          <p className="text-muted-foreground text-sm">
            {result.total} compan{result.total !== 1 ? "ies" : "y"} in your workspace
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/companies/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Add Company
            </Button>
          </Link>
        )}
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search companies…"
          filters={[{ key: "status", allLabel: "All statuses", options: RESOURCE_STATUS_OPTIONS }]}
        />
      </Suspense>

      <CompanyList
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        companies={result.companies}
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
          noun="company"
          nounPlural="companies"
        />
      </Suspense>
    </div>
  );
}
