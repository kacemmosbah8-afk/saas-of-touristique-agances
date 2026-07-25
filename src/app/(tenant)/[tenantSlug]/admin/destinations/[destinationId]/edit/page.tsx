import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getDestination } from "@/features/destinations/queries/get-destination.query";
import { DestinationEditTabs } from "@/features/destinations/components/destination-edit-tabs";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";

export const metadata = { title: "Edit Destination" };

type PageProps = { params: Promise<{ tenantSlug: string; destinationId: string }> };

export default async function EditDestinationPage({ params }: PageProps) {
  const { tenantSlug, destinationId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "destination", "view");

  const destination = await getDestination(db, destinationId);
  if (!destination) notFound();

  const canEdit = can(membership.role, "destination", "update");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/destinations`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Destinations
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{destination.name}</h1>
          <ResourceStatusBadge status={destination.status} />
        </div>
      </div>

      <DestinationEditTabs
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        destination={destination}
        canEdit={canEdit}
      />
    </div>
  );
}
