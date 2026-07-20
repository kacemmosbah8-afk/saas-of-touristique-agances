import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getFlight } from "@/features/flights/queries/get-flight.query";
import { FlightStatusBadge } from "@/features/flights/components/flight-status-badge";
import { FlightEditTabs } from "@/features/flights/components/flight-edit-tabs";

export const metadata = { title: "Edit Flight — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; flightId: string }> };

export default async function EditFlightPage({ params }: PageProps) {
  const { tenantSlug, flightId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "flight", "view");

  const flight = await getFlight(db, flightId);
  if (!flight) notFound();

  const canEdit = can(membership.role, "flight", "update");
  const canManage = can(membership.role, "flight", "manage");
  const canDelete = can(membership.role, "flight", "delete");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/flights`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Flights
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{flight.name}</h1>
          <FlightStatusBadge status={flight.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          Last updated {new Date(flight.updatedAt).toLocaleDateString()}
        </p>
      </div>

      <FlightEditTabs
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        flight={flight}
        canEdit={canEdit}
        canManage={canManage}
        canDelete={canDelete}
      />
    </div>
  );
}
