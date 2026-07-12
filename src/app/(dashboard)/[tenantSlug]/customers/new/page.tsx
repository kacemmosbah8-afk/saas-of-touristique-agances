import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import {
  getCompanyOptions,
  getMemberOptions,
} from "@/features/crm/queries/crm-options.query";
import { CustomerFormClient } from "@/features/crm/components/customer-form-client";

export const metadata = { title: "New Customer — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function NewCustomerPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "customer", "create");

  const [companies, members] = await Promise.all([
    getCompanyOptions(db),
    getMemberOptions(tenant.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/customers`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Customers
        </Link>
        <h1 className="text-xl font-semibold">New Customer</h1>
      </div>

      <CustomerFormClient
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        companies={companies}
        members={members}
      />
    </div>
  );
}
