import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getLead } from "@/features/leads/queries/get-lead.query";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { LEAD_STAGE_LABELS } from "@/features/leads/schemas/lead.schema";
import { LeadDetailPanel } from "@/features/leads/components/lead-detail";
import { Badge } from "@/shared/components/ui/badge";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Lead" };

type PageProps = { params: Promise<{ tenantSlug: string; leadId: string }> };

export default async function LeadDetailPage({ params }: PageProps) {
  const { tenantSlug, leadId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "lead", "view");

  const [lead, members] = await Promise.all([
    getLead(db, leadId),
    getMemberOptions(tenant.id),
  ]);
  if (!lead) notFound();

  const canEdit = can(membership.role, "lead", "update");
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).leads;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/leads`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.pageTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{lead.title}</h1>
          <Badge variant="secondary">{LEAD_STAGE_LABELS[lead.stage]}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {lead.contactName}
          {lead.email ? ` · ${lead.email}` : ""}
          {lead.phone ? ` · ${lead.phone}` : ""}
        </p>
      </div>

      <LeadDetailPanel
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        lead={lead}
        members={members}
        canEdit={canEdit}
        locale={locale}
      />
    </div>
  );
}
