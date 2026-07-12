import { notFound } from "next/navigation";
import { Suspense } from "react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { listPayments, getPaymentStats } from "@/features/payments/queries/list-payments.query";
import {
  listPaymentsFiltersSchema,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/features/payments/schemas/payment.schema";
import { PaymentsList } from "@/features/payments/components/payments-list";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { DataPagination } from "@/shared/components/data/data-pagination";

export const metadata = { title: "Payments — TravelOS" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "payment", "view");

  const filters = listPaymentsFiltersSchema.parse({
    search: raw.search,
    status: raw.status,
    method: raw.method,
    sort: raw.sort,
    page: raw.page,
  });

  const [{ payments, total, page, pageSize, pageCount }, stats] = await Promise.all([
    listPayments(db, filters),
    getPaymentStats(db),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Payments</h1>
        <p className="text-muted-foreground text-sm">
          {stats.total} recorded · {stats.pendingCount} pending
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Collected this month"
          value={stats.collectedThisMonth.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}
        />
        <StatCard label="Pending" value={stats.pendingCount} />
        <StatCard
          label="Refunded (all time)"
          value={stats.refundedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        />
        <StatCard label="Total payments" value={stats.total} />
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search reference, invoice or customer…"
          filters={[
            {
              key: "status",
              allLabel: "All statuses",
              options: PAYMENT_STATUSES.map((s) => ({
                value: s,
                label: PAYMENT_STATUS_LABELS[s],
              })),
            },
            {
              key: "method",
              allLabel: "All methods",
              width: "w-[170px]",
              options: PAYMENT_METHODS.map((m) => ({
                value: m,
                label: PAYMENT_METHOD_LABELS[m],
              })),
            },
          ]}
        />
      </Suspense>

      <PaymentsList tenantSlug={tenantSlug} payments={payments} />

      <DataPagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        noun="payment"
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
