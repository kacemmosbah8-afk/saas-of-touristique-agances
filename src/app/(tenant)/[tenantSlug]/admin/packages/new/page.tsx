import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { PackageFormClient } from "@/features/packages/components/package-form-client";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "New Package" };

export default async function NewPackagePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  await requirePermissionOrNotFound(tenant.id, "package", "create");

  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).packages;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/packages`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.pageTitle}
        </Link>
        <h1 className="text-xl font-semibold">{dict.newPackage}</h1>
        <p className="text-muted-foreground text-sm">{dict.newPageSubtitle}</p>
      </div>

      <PackageFormClient tenantId={tenant.id} tenantSlug={tenantSlug} locale={locale} />
    </div>
  );
}
