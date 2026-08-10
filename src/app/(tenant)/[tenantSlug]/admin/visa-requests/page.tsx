import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Download } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { listVisaRequests } from "@/features/visa-requests/queries/list-visa-requests.query";
import { listVisaRequestsFiltersSchema } from "@/features/visa-requests/schemas/visa-request.schema";
import { VISA_REQUEST_STATUSES, VISA_REQUEST_STATUS_LABELS } from "@/features/visa-requests/lib/status";
import { VisaRequestList } from "@/features/visa-requests/components/visa-request-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { Button } from "@/shared/components/ui/button";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Visa Requests" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VisaRequestsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "visaRequest", "view");

  const filters = listVisaRequestsFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    sort: raw.sort,
    page: raw.page,
  });

  const { visaRequests, total, page, pageSize, pageCount, statusCounts } = await listVisaRequests(
    db,
    filters,
  );
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).visaRequests;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{dict.pageTitle}</h1>
          <p className="text-muted-foreground text-sm">{dict.pageSubtitle}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a href={`/${tenantSlug}/admin/visa-requests/export`}>
            <Download className="me-1.5 size-4" />
            {dict.exportCsv}
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {VISA_REQUEST_STATUSES.map((s) => (
          <div key={s} className="rounded-lg border p-3">
            <p className="text-xl font-semibold tabular-nums">{statusCounts[s] ?? 0}</p>
            <p className="text-muted-foreground text-xs">{VISA_REQUEST_STATUS_LABELS[s]}</p>
          </div>
        ))}
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder={dict.searchPlaceholder}
          locale={locale}
          filters={[
            {
              key: "status",
              allLabel: dict.allStatuses,
              options: VISA_REQUEST_STATUSES.map((s) => ({
                value: s,
                label: VISA_REQUEST_STATUS_LABELS[s],
              })),
            },
          ]}
        />
      </Suspense>

      <VisaRequestList tenantSlug={tenantSlug} visaRequests={visaRequests} locale={locale} />

      <DataPagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} locale={locale} />
    </div>
  );
}
