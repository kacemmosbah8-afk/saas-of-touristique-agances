import { notFound } from "next/navigation";

import { requirePortalSession } from "@/features/portal/lib/guard";
import { getPortalVoucher } from "@/features/portal/queries/documents.query";
import { PortalVoucherView } from "@/features/portal/components/portal-voucher-view";

export const metadata = { title: "Voucher" };

type PageProps = { params: Promise<{ tenantSlug: string; bookingId: string; voucherId: string }> };

export default async function PortalVoucherPage({ params }: PageProps) {
  const { tenantSlug, bookingId, voucherId } = await params;
  const ctx = await requirePortalSession(tenantSlug);

  const voucher = await getPortalVoucher(ctx.db, ctx.tenantId, ctx.customerId, voucherId);
  if (!voucher || voucher.bookingId !== bookingId) notFound();

  return <PortalVoucherView tenantSlug={tenantSlug} bookingId={bookingId} voucher={voucher} />;
}
