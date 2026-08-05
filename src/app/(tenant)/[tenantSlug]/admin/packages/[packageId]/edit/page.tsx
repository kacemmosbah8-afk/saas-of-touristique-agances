import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getPackage } from "@/features/packages/queries/get-package.query";
import { getItinerary } from "@/features/itinerary/queries/get-itinerary.query";
import { getPackageInventory } from "@/features/package-inventory/queries/get-package-inventory.query";
import { getInventoryOptions } from "@/features/package-inventory/queries/inventory-options.query";
import { PackageStatusBadge } from "@/features/packages/components/package-status-badge";
import { PackageEditTabs } from "@/features/packages/components/package-edit-tabs";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Edit Package" };

type PageProps = {
  params: Promise<{ tenantSlug: string; packageId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditPackagePage({ params, searchParams }: PageProps) {
  const { tenantSlug, packageId } = await params;
  const rawSearch = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  // view permission is minimum requirement to see the page
  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "package", "view");

  const [pkg, itineraryDays, inventory, inventoryOptions] = await Promise.all([
    getPackage(db, packageId),
    getItinerary(db, packageId),
    getPackageInventory(db, packageId),
    getInventoryOptions(db),
  ]);
  if (!pkg) notFound();

  const canEdit = can(membership.role, "package", "update");
  const canManage = can(membership.role, "package", "manage");
  const canDelete = can(membership.role, "package", "delete");

  const activeTab = typeof rawSearch.tab === "string" ? rawSearch.tab : "details";
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).packages;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/packages`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.pageTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{pkg.name}</h1>
          <PackageStatusBadge status={pkg.status} locale={locale} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-muted-foreground text-sm">
            {dict.lastUpdated(new Date(pkg.updatedAt).toLocaleDateString())}
          </p>
          {pkg.status === "PUBLISHED" ? (
            <a
              href={`/${tenantSlug}/packages/${pkg.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-sm underline underline-offset-2"
            >
              {dict.viewOnPublicSite}
            </a>
          ) : (
            <p className="text-muted-foreground text-sm">{dict.notLiveYet}</p>
          )}
        </div>
      </div>

      <PackageEditTabs
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        pkg={pkg}
        activeTab={activeTab}
        canEdit={canEdit}
        canManage={canManage}
        canDelete={canDelete}
        itineraryDays={itineraryDays}
        inventory={inventory}
        inventoryOptions={inventoryOptions}
        locale={locale}
      />
    </div>
  );
}
