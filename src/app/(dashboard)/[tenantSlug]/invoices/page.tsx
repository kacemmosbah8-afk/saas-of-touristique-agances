import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listInvoices, getInvoiceStats } from "@/features/invoices/queries/list-invoices.query";
import { listInvoicesFiltersSchema } from "@/features/invoices/schemas/invoice.schema";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
} from "@/features/invoices/lib/invoice-status";
import { InvoiceList } from "@/features/invoices/components/invoice-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Invoices — TravelOS" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvoicesPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "invoice", "view");

  const filters = listInvoicesFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    due: raw.due,
    sort: raw.sort,
    page: raw.page,
  });

  const [{ invoices, total, page, pageSize, pageCount }, stats] = await Promise.all([
    listInvoices(db, filters),
    getInvoiceStats(db),
  ]);

  const canCreate = can(membership.role, "invoice", "create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Invoices</h1>
          <p className="text-muted-foreground text-sm">
            {stats.total} total · {stats.overdueCount} overdue
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/invoices/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              New Invoice
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={stats.outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        />
        <StatCard
          label="Collected"
          value={stats.collected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        />
        <StatCard label="Overdue" value={stats.overdueCount} />
        <StatCard label="Paid" value={stats.byStatus.PAID} />
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search reference, customer or booking…"
          filters={[
            {
              key: "status",
              allLabel: "All statuses",
              options: INVOICE_STATUSES.map((s) => ({
                value: s,
                label: INVOICE_STATUS_LABELS[s],
              })),
            },
            {
              key: "due",
              allLabel: "Any due date",
              width: "w-[150px]",
              options: [{ value: "overdue", label: "Overdue" }],
            },
          ]}
        />
      </Suspense>

      <InvoiceList tenantSlug={tenantSlug} invoices={invoices} canCreate={canCreate} />

      <DataPagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        noun="invoice"
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
