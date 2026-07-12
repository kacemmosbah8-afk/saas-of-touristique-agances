import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getPackage } from "@/features/packages/queries/get-package.query";
import { updatePackageAction } from "@/features/packages/actions/update-package.action";
import { PackageForm } from "@/features/packages/components/package-form";
import { PackageStatusBadge } from "@/features/packages/components/package-status-badge";
import { PackageStatusActions } from "@/features/packages/components/package-status-actions";

export const metadata = { title: "Edit Package — TravelOS" };

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ tenantSlug: string; packageId: string }>;
}) {
  const { tenantSlug, packageId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(
    tenant.id,
    "package",
    "update",
  );

  const pkg = await getPackage(db, packageId);
  if (!pkg) notFound();

  const canManage = can(membership.role, "package", "manage");
  const canDelete = can(membership.role, "package", "delete");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/packages`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Packages
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{pkg.name}</h1>
          <PackageStatusBadge status={pkg.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          Last updated {new Date(pkg.updatedAt).toLocaleDateString()}
        </p>
      </div>

      <PackageForm
        tenantSlug={tenantSlug}
        defaultValues={{
          name: pkg.name,
          slug: pkg.slug,
          description: pkg.description ?? undefined,
          duration: pkg.duration ?? undefined,
          destination: pkg.destination ?? undefined,
        }}
        submitLabel="Save Changes"
        onSubmit={(values) => updatePackageAction(tenant.id, pkg.id, values)}
      />

      <PackageStatusActions
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        packageId={pkg.id}
        status={pkg.status}
        canManage={canManage}
        canDelete={canDelete}
      />
    </div>
  );
}
