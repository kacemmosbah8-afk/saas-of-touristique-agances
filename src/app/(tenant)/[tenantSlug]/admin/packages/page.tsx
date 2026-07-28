import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import {
  listPackages,
} from "@/features/packages/queries/list-packages.query";
import { listPackagesFiltersSchema } from "@/features/packages/schemas/package.schema";
import { PackageList } from "@/features/packages/components/package-list";
import { PackageFilterBar } from "@/features/packages/components/package-filter-bar";
import { PackagePagination } from "@/features/packages/components/package-pagination";
import { Button } from "@/shared/components/ui/button";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Packages" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PackagesPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const rawSearch = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "package", "view");

  const filters = listPackagesFiltersSchema.parse({
    search: rawSearch.search,
    status: rawSearch.status,
    sort: rawSearch.sort,
    page: rawSearch.page,
  });

  const result = await listPackages(db, filters);

  const canCreate = can(membership.role, "package", "create");
  const canManage = can(membership.role, "package", "manage");
  const canDelete = can(membership.role, "package", "delete");
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).packages;

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
          <Link href={`/${tenantSlug}/admin/packages/new`}>
            <Button size="sm">
              <Plus className="me-1.5 size-4" />
              {dict.newPackage}
            </Button>
          </Link>
        )}
      </div>

      <Suspense>
        <PackageFilterBar locale={locale} />
      </Suspense>

      <PackageList
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        packages={result.packages}
        canCreate={canCreate}
        canManage={canManage}
        canDelete={canDelete}
        locale={locale}
      />

      <Suspense>
        <PackagePagination
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
