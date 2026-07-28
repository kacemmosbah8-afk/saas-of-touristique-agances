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
import { LEAD_SOURCES, LEAD_SOURCE_LABELS } from "@/features/crm/schemas/customer.schema";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { LeadPipeline } from "@/features/leads/components/lead-pipeline";
import { ResourceFilterBar } from "@/shared/components/data/resource-filter-bar";
import { Button } from "@/shared/components/ui/button";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Leads" };

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
    source: raw.source,
    sort: raw.sort,
  });

  const [{ leads, stats }, members] = await Promise.all([
    getLeadPipeline(db, filters),
    getMemberOptions(tenant.id),
  ]);

  const canCreate = can(membership.role, "lead", "create");
  const canEdit = can(membership.role, "lead", "update");
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).leads;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{dict.pageTitle}</h1>
          <p className="text-muted-foreground text-sm">
            {stats.openCount} {dict.openLead} · {stats.wonCount} {dict.won} · {stats.lostCount}{" "}
            {dict.lost}
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/admin/leads/new`}>
            <Button size="sm">
              <Plus className="me-1.5 size-4" />
              {dict.addLead}
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={dict.statOpenLeads} value={stats.openCount} />
        <StatCard
          label={dict.statPipelineValue}
          value={stats.openValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        />
        <StatCard label={dict.statWon} value={stats.wonCount} />
        <StatCard
          label={dict.statOverdueReminders}
          value={stats.overdueReminders}
          alert={stats.overdueReminders > 0}
        />
      </div>

      <Suspense>
        <ResourceFilterBar
          searchPlaceholder={dict.searchPlaceholder}
          locale={locale}
          filters={[
            {
              key: "stage",
              allLabel: dict.allStages,
              options: LEAD_STAGES.map((s) => ({ value: s, label: LEAD_STAGE_LABELS[s] })),
            },
            {
              key: "owner",
              allLabel: dict.allOwners,
              width: "w-[170px]",
              options: members.map((m) => ({ value: m.userId, label: m.name })),
            },
            {
              key: "source",
              allLabel: dict.allSources,
              width: "w-[170px]",
              options: LEAD_SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABELS[s] })),
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
        locale={locale}
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
