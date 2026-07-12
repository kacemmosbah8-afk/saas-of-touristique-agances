import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { getCompany } from "@/features/crm/queries/get-company.query";
import { CompanyFormClient } from "@/features/crm/components/company-form-client";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";

export const metadata = { title: "Edit Company — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; companyId: string }> };

export default async function EditCompanyPage({ params }: PageProps) {
  const { tenantSlug, companyId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "company", "view");

  const company = await getCompany(db, companyId);
  if (!company) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/companies`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Companies
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{company.name}</h1>
          <ResourceStatusBadge status={company.status} />
        </div>
      </div>

      <CompanyFormClient tenantId={tenant.id} tenantSlug={tenantSlug} company={company} />
    </div>
  );
}
