import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { getVoucher } from "@/features/vouchers/queries/voucher.query";
import { VoucherView } from "@/features/vouchers/components/voucher-view";

export const metadata = { title: "Voucher — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; voucherId: string }> };

export default async function VoucherPage({ params }: PageProps) {
  const { tenantSlug, voucherId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "booking", "view");

  const voucher = await getVoucher(db, tenant.id, voucherId);
  if (!voucher) notFound();

  return <VoucherView tenantSlug={tenantSlug} voucher={voucher} />;
}
