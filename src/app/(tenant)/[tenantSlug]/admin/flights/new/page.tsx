import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { FlightFormClient } from "@/features/flights/components/flight-form-client";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "New Flight" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function NewFlightPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  await requirePermissionOrNotFound(tenant.id, "flight", "create");

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
        <h1 className="text-xl font-semibold">{dict.newPageTitle}</h1>
        <p className="text-muted-foreground text-sm">{dict.newPageSubtitle}</p>
      </div>

      <FlightFormClient tenantId={tenant.id} tenantSlug={tenantSlug} locale={locale} />
    </div>
  );
}
