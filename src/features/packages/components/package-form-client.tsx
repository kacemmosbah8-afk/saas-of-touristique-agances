"use client";

import { createPackageAction } from "@/features/packages/actions/create-package.action";
import { PackageForm } from "@/features/packages/components/package-form";
import { type Locale } from "@/shared/i18n/dictionary";

export function PackageFormClient({
  tenantId,
  tenantSlug,
  locale,
}: {
  tenantId: string;
  tenantSlug: string;
  locale: Locale;
}) {
  return (
    <PackageForm
      tenantSlug={tenantSlug}
      onSubmit={(values) => createPackageAction(tenantId, values)}
      locale={locale}
    />
  );
}
