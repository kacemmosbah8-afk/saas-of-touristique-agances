import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getCustomer } from "@/features/crm/queries/get-customer.query";
import { getMemberOptions, getTagOptions } from "@/features/crm/queries/crm-options.query";
import { CUSTOMER_TYPE_LABELS } from "@/features/crm/schemas/customer.schema";
import { CustomerDetailTabs } from "@/features/crm/components/customer-detail-tabs";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { Badge } from "@/shared/components/ui/badge";

export const metadata = { title: "Customer — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; customerId: string }> };

export default async function CustomerDetailPage({ params }: PageProps) {
  const { tenantSlug, customerId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "customer", "view");

  const [customer, members, availableTags] = await Promise.all([
    getCustomer(db, customerId),
    getMemberOptions(tenant.id),
    getTagOptions(db),
  ]);
  if (!customer) notFound();

  const canEdit = can(membership.role, "customer", "update");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/customers`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Customers
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">
            {customer.firstName} {customer.lastName}
          </h1>
          <Badge variant="secondary">{CUSTOMER_TYPE_LABELS[customer.type]}</Badge>
          <ResourceStatusBadge status={customer.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {[customer.email, customer.phone].filter(Boolean).join(" · ") || "No contact info"}
        </p>
      </div>

      <CustomerDetailTabs
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        customer={customer}
        members={members}
        availableTags={availableTags}
        canEdit={canEdit}
      />
    </div>
  );
}
