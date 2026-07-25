import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { PackageFormClient } from "@/features/packages/components/package-form-client";

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/packages`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Packages
        </Link>
        <h1 className="text-xl font-semibold">New Package</h1>
        <p className="text-muted-foreground text-sm">
          Start building a new travel package. You can publish it once it&apos;s ready.
        </p>
      </div>

      <PackageFormClient tenantId={tenant.id} tenantSlug={tenantSlug} />
    </div>
  );
}
