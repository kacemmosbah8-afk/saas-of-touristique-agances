import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getLeadPipeline } from "@/features/leads/queries/list-leads.query";
import {
  listLeadsFiltersSchema,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
} from "@/features/leads/schemas/lead.schema";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { LeadPipeline } from "@/features/leads/components/lead-pipeline";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Leads — TravelOS" };

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeadsPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const raw = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "lead", "view");

  const filters = listLeadsFiltersSchema.parse({
    search: raw.search,
    stage: raw.stage,
    owner: raw.owner,
    sort: raw.sort,
  });

  const [{ leads, stats }, members] = await Promise.all([
    getLeadPipeline(db, filters),
    getMemberOptions(tenant.id),
  ]);

  const canCreate = can(membership.role, "lead", "create");
  const canEdit = can(membership.role, "lead", "update");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-muted-foreground text-sm">
            {stats.openCount} open lead{stats.openCount !== 1 ? "s" : ""} · {stats.wonCount} won ·{" "}
            {stats.lostCount} lost
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/admin/leads/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              Add Lead
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Open Leads" value={stats.openCount} />
        <StatCard
          label="Pipeline Value"
          value={stats.openValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        />
        <StatCard label="Won" value={stats.wonCount} />
        <StatCard
          label="Overdue Reminders"
          value={stats.overdueReminders}
          alert={stats.overdueReminders > 0}
        />
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder="Search leads…"
          filters={[
            {
              key: "stage",
              allLabel: "All stages",
              options: LEAD_STAGES.map((s) => ({ value: s, label: LEAD_STAGE_LABELS[s] })),
            },
            {
              key: "owner",
              allLabel: "All owners",
              width: "w-[170px]",
              options: members.map((m) => ({ value: m.userId, label: m.name })),
            },
          ]}
        />
      </Suspense>

      <LeadPipeline
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        leads={leads}
        members={members}
        canEdit={canEdit}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  alert,
}: {
  label: string;
  value: number | string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className={`text-xl font-semibold tabular-nums ${alert ? "text-red-500" : ""}`}>
        {value}
      </p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
