import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listHotels } from "@/features/hotels/queries/list-hotels.query";
import {
  listHotelsFiltersSchema,
  HOTEL_CATEGORIES,
} from "@/features/hotels/schemas/hotel.schema";
import { HOTEL_CATEGORY_LABELS } from "@/features/hotels/lib/labels";
import { HotelList } from "@/features/hotels/components/hotel-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { RESOURCE_STATUS_OPTIONS } from "@/shared/lib/resource-status";
import { Button } from "@/shared/components/ui/button";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Hotels" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HotelsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "hotel", "view");

  const filters = listHotelsFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    sort: raw.sort,
    page: raw.page,
    category: raw.category,
    stars: raw.stars,
  });

  const result = await listHotels(db, filters);

  const canCreate = can(membership.role, "hotel", "create");
  const canManage = can(membership.role, "hotel", "manage");
  const canDelete = can(membership.role, "hotel", "delete");
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).hotels;
  const common = getAdminDictionary(locale).common;

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
          <Link href={`/${tenantSlug}/admin/hotels/new`}>
            <Button size="sm">
              <Plus className="me-1.5 size-4" />
              {dict.addHotel}
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
              key: "category",
              allLabel: dict.allCategories,
              options: HOTEL_CATEGORIES.map((c) => ({ value: c, label: HOTEL_CATEGORY_LABELS[c] })),
            },
            {
              key: "stars",
              allLabel: dict.allStars,
              width: "w-[120px]",
              options: [5, 4, 3, 2, 1].map((s) => ({ value: String(s), label: dict.starsLabel(s) })),
            },
          ]}
        />
      </Suspense>

      <HotelList
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        hotels={result.hotels}
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
