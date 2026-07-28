"use client";

import { createActivityCatalogAction } from "@/features/activities/actions/activity.action";
import { ActivityCatalogForm } from "@/features/activities/components/activity-catalog-form";
import type { SupplierOption } from "@/features/suppliers/queries/supplier-options.query";
import { type Locale } from "@/shared/i18n/dictionary";

export function ActivityFormClient({
  tenantId,
  tenantSlug,
  suppliers,
  locale,
}: {
  tenantId: string;
  tenantSlug: string;
  suppliers: SupplierOption[];
  locale: Locale;
}) {
  return (
    <ActivityCatalogForm
      mode="create"
      tenantSlug={tenantSlug}
      suppliers={suppliers}
      onSubmit={(values) => createActivityCatalogAction(tenantId, values)}
      locale={locale}
    />
  );
}
