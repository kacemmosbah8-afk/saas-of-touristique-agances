import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listGuides } from "@/features/guides/queries/list-guides.query";
import { listGuidesFiltersSchema } from "@/features/guides/schemas/guide.schema";
import { GuideList } from "@/features/guides/components/guide-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { RESOURCE_STATUS_OPTIONS } from "@/shared/lib/resource-status";
import { Button } from "@/shared/components/ui/button";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Tour Guides" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GuidesPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "guide", "view");

  const filters = listGuidesFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    sort: raw.sort,
    page: raw.page,
  });

  const result = await listGuides(db, filters);

  const canCreate = can(membership.role, "guide", "create");
  const canManage = can(membership.role, "guide", "manage");
  const canDelete = can(membership.role, "guide", "delete");
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).guides;
  const common = getAdminDictionary(locale).common;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{dict.pageTitle}</h1>
          <p className="text-muted-foreground text-sm">{dict.pageSubtitleCount(result.total)}</p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/admin/guides/new`}>
            <Button size="sm">
              <Plus className="me-1.5 size-4" />
              {dict.addGuide}
            </Button>
          </Link>
        )}
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder={dict.searchPlaceholder}
          locale={locale}
          filters={[{ key: "status", allLabel: common.allStatuses, options: RESOURCE_STATUS_OPTIONS }]}
        />
      </Suspense>

      <GuideList
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        guides={result.guides}
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
