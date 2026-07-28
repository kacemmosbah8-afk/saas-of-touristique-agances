"use client";

import { createSupplierAction } from "@/features/suppliers/actions/supplier.action";
import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { type Locale } from "@/shared/i18n/dictionary";

export function SupplierFormClient({
  tenantId,
  tenantSlug,
  locale,
}: {
  tenantId: string;
  tenantSlug: string;
  locale: Locale;
}) {
  return (
    <SupplierForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createSupplierAction(tenantId, values)}
      locale={locale}
    />
  );
}
