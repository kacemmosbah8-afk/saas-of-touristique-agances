import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { HotelFormClient } from "@/features/hotels/components/hotel-form-client";

export const metadata = { title: "New Hotel — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function NewHotelPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  await requirePermissionOrNotFound(tenant.id, "hotel", "create");

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
        <h1 className="text-xl font-semibold">New Hotel</h1>
      </div>

      <HotelFormClient tenantId={tenant.id} tenantSlug={tenantSlug} />
    </div>
  );
}
