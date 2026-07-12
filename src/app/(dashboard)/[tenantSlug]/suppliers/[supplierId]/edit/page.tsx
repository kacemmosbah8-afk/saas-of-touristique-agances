import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getSupplier } from "@/features/suppliers/queries/get-supplier.query";
import { SupplierEditTabs } from "@/features/suppliers/components/supplier-edit-tabs";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";

export const metadata = { title: "Edit Supplier — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; supplierId: string }> };

export default async function EditSupplierPage({ params }: PageProps) {
  const { tenantSlug, supplierId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "supplier", "view");

  const supplier = await getSupplier(db, supplierId);
  if (!supplier) notFound();

  const canEdit = can(membership.role, "supplier", "update");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/suppliers`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Suppliers
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{supplier.name}</h1>
          <ResourceStatusBadge status={supplier.status} />
        </div>
      </div>

      <SupplierEditTabs
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        supplier={supplier}
        canEdit={canEdit}
      />
    </div>
  );
}
