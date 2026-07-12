import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getPackage } from "@/features/packages/queries/get-package.query";
import { getItinerary } from "@/features/itinerary/queries/get-itinerary.query";
import { PackageStatusBadge } from "@/features/packages/components/package-status-badge";
import { PackageEditTabs } from "@/features/packages/components/package-edit-tabs";

export const metadata = { title: "Edit Package — TravelOS" };

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

  const [pkg, itineraryDays] = await Promise.all([
    getPackage(db, packageId),
    getItinerary(db, packageId),
  ]);
  if (!pkg) notFound();

  const canEdit = can(membership.role, "package", "update");
  const canManage = can(membership.role, "package", "manage");
  const canDelete = can(membership.role, "package", "delete");

  const activeTab = typeof rawSearch.tab === "string" ? rawSearch.tab : "details";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/packages`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Packages
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{pkg.name}</h1>
          <PackageStatusBadge status={pkg.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          Last updated {new Date(pkg.updatedAt).toLocaleDateString()}
        </p>
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
      />
    </div>
  );
}
