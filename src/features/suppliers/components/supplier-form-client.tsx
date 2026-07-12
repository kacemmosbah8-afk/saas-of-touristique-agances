"use client";

import { createSupplierAction } from "@/features/suppliers/actions/supplier.action";
import { SupplierForm } from "@/features/suppliers/components/supplier-form";

export function SupplierFormClient({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
  return (
    <SupplierForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createSupplierAction(tenantId, values)}
    />
  );
}
