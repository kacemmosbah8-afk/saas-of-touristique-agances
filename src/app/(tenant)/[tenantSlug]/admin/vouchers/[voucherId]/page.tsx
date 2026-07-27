import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { getVoucher } from "@/features/vouchers/queries/voucher.query";
import { VoucherView } from "@/features/vouchers/components/voucher-view";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";

export const metadata = { title: "Voucher" };

type PageProps = { params: Promise<{ tenantSlug: string; voucherId: string }> };

export default async function VoucherPage({ params }: PageProps) {
  const { tenantSlug, voucherId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "booking", "view");

  const voucher = await getVoucher(db, tenant.id, voucherId);
  if (!voucher) notFound();

  const locale = await getVisitorLocale();

  return <VoucherView tenantSlug={tenantSlug} voucher={voucher} locale={locale} />;
}
