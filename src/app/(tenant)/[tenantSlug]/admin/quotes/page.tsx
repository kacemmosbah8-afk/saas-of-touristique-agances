import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listQuotes, getQuoteStats } from "@/features/quotes/queries/list-quotes.query";
import { listQuotesFiltersSchema } from "@/features/quotes/schemas/quote.schema";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS } from "@/features/quotes/lib/quote-status";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { QuoteList } from "@/features/quotes/components/quote-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Quotes" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuotesPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "quote", "view");

  const filters = listQuotesFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    owner: raw.owner,
    sort: raw.sort,
    page: raw.page,
  });

  const [{ quotes, total, page, pageSize, pageCount }, stats, members] = await Promise.all([
    listQuotes(db, filters),
    getQuoteStats(db),
    getMemberOptions(tenant.id),
  ]);

  const canCreate = can(membership.role, "quote", "create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quotes</h1>
          <p className="text-muted-foreground text-sm">
            {stats.total} total · {stats.byStatus.SENT} sent · {stats.acceptanceRate}% acceptance
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/admin/quotes/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              New Quote
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Open value"
          value={stats.openValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        />
        <StatCard label="Sent" value={stats.byStatus.SENT} />
        <StatCard label="Accepted" value={stats.byStatus.ACCEPTED} />
        <StatCard label="Converted" value={stats.byStatus.CONVERTED} />
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search reference or customer…"
          filters={[
            {
              key: "status",
              allLabel: "All statuses",
              options: QUOTE_STATUSES.map((s) => ({ value: s, label: QUOTE_STATUS_LABELS[s] })),
            },
            {
              key: "owner",
              allLabel: "All agents",
              width: "w-[170px]",
              options: members.map((m) => ({ value: m.userId, label: m.name })),
            },
          ]}
        />
      </Suspense>

      <QuoteList tenantSlug={tenantSlug} quotes={quotes} canCreate={canCreate} />

      <DataPagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        noun="quote"
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
