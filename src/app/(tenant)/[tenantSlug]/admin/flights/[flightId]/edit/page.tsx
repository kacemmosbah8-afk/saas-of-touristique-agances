import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getFlight } from "@/features/flights/queries/get-flight.query";
import { FlightStatusBadge } from "@/features/flights/components/flight-status-badge";
import { FlightEditTabs } from "@/features/flights/components/flight-edit-tabs";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Edit Flight" };

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
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).flights;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/flights`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.pageTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{flight.name}</h1>
          <FlightStatusBadge status={flight.status} locale={locale} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-muted-foreground text-sm">
            {dict.lastUpdated(new Date(flight.updatedAt).toLocaleDateString())}
          </p>
          {flight.status === "PUBLISHED" ? (
            <a
              href={`/${tenantSlug}/flights/${flight.slug}`}
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

      <FlightEditTabs
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        flight={flight}
        canEdit={canEdit}
        canManage={canManage}
        canDelete={canDelete}
        locale={locale}
      />
    </div>
  );
}
