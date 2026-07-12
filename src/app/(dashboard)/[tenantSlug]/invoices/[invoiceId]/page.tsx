import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getInvoice } from "@/features/invoices/queries/get-invoice.query";
import { InvoiceDetail } from "@/features/invoices/components/invoice-detail";

export const metadata = { title: "Invoice — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; invoiceId: string }> };

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { tenantSlug, invoiceId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "invoice", "view");

  const invoice = await getInvoice(db, tenant.id, invoiceId);
  if (!invoice) notFound();

  return (
    <InvoiceDetail
      tenantId={tenant.id}
      tenantSlug={tenantSlug}
      invoice={invoice}
      canEdit={can(membership.role, "invoice", "update")}
      canManage={can(membership.role, "invoice", "manage")}
      canCreatePayment={can(membership.role, "payment", "create")}
      canManagePayment={can(membership.role, "payment", "manage")}
    />
  );
}
