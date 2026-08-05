import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getHotel } from "@/features/hotels/queries/get-hotel.query";
import { HotelEditTabs } from "@/features/hotels/components/hotel-edit-tabs";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Edit Hotel" };

type PageProps = { params: Promise<{ tenantSlug: string; hotelId: string }> };

export default async function EditHotelPage({ params }: PageProps) {
  const { tenantSlug, hotelId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "hotel", "view");

  const hotel = await getHotel(db, hotelId);
  if (!hotel) notFound();

  const canEdit = can(membership.role, "hotel", "update");
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).hotels;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/hotels`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.pageTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{hotel.name}</h1>
          <ResourceStatusBadge status={hotel.status} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-muted-foreground text-sm">
            {dict.lastUpdated(new Date(hotel.updatedAt).toLocaleDateString())}
          </p>
          {hotel.status === "ACTIVE" ? (
            <a
              href={`/${tenantSlug}/hotels/${hotel.slug}`}
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

      <HotelEditTabs
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        hotel={hotel}
        canEdit={canEdit}
        locale={locale}
      />
    </div>
  );
}
