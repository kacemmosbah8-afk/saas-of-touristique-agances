"use client";

import { createPackageAction } from "@/features/packages/actions/create-package.action";
import { PackageForm } from "@/features/packages/components/package-form";

export function PackageFormClient({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
  return (
    <PackageForm tenantSlug={tenantSlug} onSubmit={(values) => createPackageAction(tenantId, values)} />
  );
}
