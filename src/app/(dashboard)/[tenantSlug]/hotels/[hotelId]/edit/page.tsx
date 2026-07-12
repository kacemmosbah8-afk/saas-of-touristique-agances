import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getHotel } from "@/features/hotels/queries/get-hotel.query";
import { HotelEditTabs } from "@/features/hotels/components/hotel-edit-tabs";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";

export const metadata = { title: "Edit Hotel — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; hotelId: string }> };

export default async function EditHotelPage({ params }: PageProps) {
  const { tenantSlug, hotelId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "hotel", "view");

  const hotel = await getHotel(db, hotelId);
  if (!hotel) notFound();

  const canEdit = can(membership.role, "hotel", "update");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/hotels`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Hotels
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{hotel.name}</h1>
          <ResourceStatusBadge status={hotel.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          Last updated {new Date(hotel.updatedAt).toLocaleDateString()}
        </p>
      </div>

      <HotelEditTabs
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        hotel={hotel}
        canEdit={canEdit}
      />
    </div>
  );
}
