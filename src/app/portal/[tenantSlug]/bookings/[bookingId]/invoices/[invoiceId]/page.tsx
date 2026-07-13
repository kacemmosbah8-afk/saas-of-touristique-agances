import { notFound } from "next/navigation";

import { requirePortalSession } from "@/features/portal/lib/guard";
import { getPortalInvoice } from "@/features/portal/queries/documents.query";
import { PortalInvoiceView } from "@/features/portal/components/portal-invoice-view";

export const metadata = { title: "Invoice" };

type PageProps = { params: Promise<{ tenantSlug: string; bookingId: string; invoiceId: string }> };

export default async function PortalInvoicePage({ params }: PageProps) {
  const { tenantSlug, bookingId, invoiceId } = await params;
  const ctx = await requirePortalSession(tenantSlug);

  const invoice = await getPortalInvoice(ctx.db, ctx.tenantId, ctx.customerId, invoiceId);
  if (!invoice || invoice.bookingId !== bookingId) notFound();

  return <PortalInvoiceView tenantSlug={tenantSlug} bookingId={bookingId} invoice={invoice} />;
}
