import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getVisaRequest } from "@/features/visa-requests/queries/get-visa-request.query";
import { VisaRequestDetail } from "@/features/visa-requests/components/visa-request-detail";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";

export const metadata = { title: "Visa Request" };

type PageProps = { params: Promise<{ tenantSlug: string; visaRequestId: string }> };

export default async function VisaRequestDetailPage({ params }: PageProps) {
  const { tenantSlug, visaRequestId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "visaRequest", "view");

  const visaRequest = await getVisaRequest(db, tenant.id, visaRequestId);
  if (!visaRequest) notFound();
  const locale = await getVisitorLocale();

  return (
    <VisaRequestDetail
      tenantId={tenant.id}
      tenantSlug={tenantSlug}
      visaRequest={visaRequest}
      canEdit={can(membership.role, "visaRequest", "update")}
      locale={locale}
    />
  );
}
