import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getQuote } from "@/features/quotes/queries/get-quote.query";
import { getPricingCatalog } from "@/features/quotes/queries/pricing-catalog.query";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { QuoteDetail } from "@/features/quotes/components/quote-detail";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";

export const metadata = { title: "Quote" };

type PageProps = { params: Promise<{ tenantSlug: string; quoteId: string }> };

export default async function QuoteDetailPage({ params }: PageProps) {
  const { tenantSlug, quoteId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "quote", "view");

  const [quote, members, catalog] = await Promise.all([
    getQuote(db, tenant.id, quoteId),
    getMemberOptions(tenant.id),
    getPricingCatalog(db),
  ]);
  if (!quote) notFound();

  const locale = await getVisitorLocale();

  return (
    <QuoteDetail
      tenantId={tenant.id}
      tenantSlug={tenantSlug}
      quote={quote}
      members={members}
      catalog={catalog}
      canEdit={can(membership.role, "quote", "update")}
      canConvertToBooking={can(membership.role, "booking", "create")}
      locale={locale}
    />
  );
}
