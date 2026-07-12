import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { LeadFormClient } from "@/features/leads/components/lead-form-client";

export const metadata = { title: "New Lead — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function NewLeadPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  await requirePermissionOrNotFound(tenant.id, "lead", "create");
  const members = await getMemberOptions(tenant.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/leads`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Leads
        </Link>
        <h1 className="text-xl font-semibold">New Lead</h1>
      </div>

      <LeadFormClient tenantId={tenant.id} tenantSlug={tenantSlug} members={members} />
    </div>
  );
}
