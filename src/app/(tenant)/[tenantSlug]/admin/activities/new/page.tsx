import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { getSupplierOptions } from "@/features/suppliers/queries/supplier-options.query";
import { ActivityFormClient } from "@/features/activities/components/activity-form-client";

export const metadata = { title: "New Activity — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function NewActivityPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "activity", "create");
  const suppliers = await getSupplierOptions(db);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/activities`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Activities
        </Link>
        <h1 className="text-xl font-semibold">New Activity</h1>
      </div>

      <ActivityFormClient tenantId={tenant.id} tenantSlug={tenantSlug} suppliers={suppliers} />
    </div>
  );
}
