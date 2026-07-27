import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import {
  getCustomerOptions,
  getPackageOptions,
} from "@/features/bookings/queries/booking-options.query";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { QuoteFormClient } from "@/features/quotes/components/quote-form-client";
import { Button } from "@/shared/components/ui/button";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "New Quote" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function NewQuotePage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "quote", "create");

  const [customers, packages, members] = await Promise.all([
    getCustomerOptions(db),
    getPackageOptions(db),
    getMemberOptions(tenant.id),
  ]);

  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).quotes;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/quotes`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.backToList}
        </Link>
        <h1 className="text-xl font-semibold">{dict.newPageTitle}</h1>
        <p className="text-muted-foreground text-sm">{dict.newPageSubtitle}</p>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm">
          <p className="text-muted-foreground">{dict.needCustomerFirst}</p>
          <Link href={`/${tenantSlug}/admin/customers/new`} className="mt-3 inline-block">
            <Button size="sm">{dict.addCustomer}</Button>
          </Link>
        </div>
      ) : (
        <QuoteFormClient
          tenantId={tenant.id}
          tenantSlug={tenantSlug}
          customers={customers}
          packages={packages}
          members={members}
          locale={locale}
        />
      )}
    </div>
  );
}
