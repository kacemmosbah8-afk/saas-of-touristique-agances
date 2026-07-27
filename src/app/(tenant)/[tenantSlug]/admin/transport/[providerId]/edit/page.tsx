import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { getTransport } from "@/features/transport/queries/get-transport.query";
import { TransportFormClient } from "@/features/transport/components/transport-form-client";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Edit Provider" };

type PageProps = { params: Promise<{ tenantSlug: string; providerId: string }> };

export default async function EditTransportPage({ params }: PageProps) {
  const { tenantSlug, providerId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "transport", "view");

  const provider = await getTransport(db, providerId);
  if (!provider) notFound();

  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).transport;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/transport`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.pageTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{provider.name}</h1>
          <ResourceStatusBadge status={provider.status} />
        </div>
      </div>

      <TransportFormClient
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        provider={provider}
        locale={locale}
      />
    </div>
  );
}
