import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { getMemberOptions } from "@/features/crm/queries/crm-options.query";
import { CustomerFormClient } from "@/features/crm/components/customer-form-client";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "New Customer" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function NewCustomerPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  await requirePermissionOrNotFound(tenant.id, "customer", "create");

  const members = await getMemberOptions(tenant.id);
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).customers;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/customers`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.pageTitle}
        </Link>
        <h1 className="text-xl font-semibold">{dict.addCustomer}</h1>
      </div>

      <CustomerFormClient
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        members={members}
        locale={locale}
      />
    </div>
  );
}
