"use client";

import { createActivityCatalogAction } from "@/features/activities/actions/activity.action";
import { ActivityCatalogForm } from "@/features/activities/components/activity-catalog-form";
import type { SupplierOption } from "@/features/suppliers/queries/supplier-options.query";

export function ActivityFormClient({
  tenantId,
  tenantSlug,
  suppliers,
}: {
  tenantId: string;
  tenantSlug: string;
  suppliers: SupplierOption[];
}) {
  return (
    <ActivityCatalogForm
      mode="create"
      tenantSlug={tenantSlug}
      suppliers={suppliers}
      onSubmit={(values) => createActivityCatalogAction(tenantId, values)}
    />
  );
}
