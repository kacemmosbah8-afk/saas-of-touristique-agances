import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listPackages } from "@/features/packages/queries/list-packages.query";
import { PackageList } from "@/features/packages/components/package-list";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Packages — TravelOS" };

export default async function PackagesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(
    tenant.id,
    "package",
    "view",
  );

  const packages = await listPackages(db);

  const canCreate = can(membership.role, "package", "create");
  const canManage = can(membership.role, "package", "manage");
  const canDelete = can(membership.role, "package", "delete");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Packages</h1>
          <p className="text-muted-foreground text-sm">
            {packages.length} package{packages.length !== 1 ? "s" : ""} in your workspace
          </p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/packages/new`}>
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              New Package
            </Button>
          </Link>
        )}
      </div>

      <PackageList
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        packages={packages}
        canManage={canManage}
        canDelete={canDelete}
      />
    </div>
  );
}
