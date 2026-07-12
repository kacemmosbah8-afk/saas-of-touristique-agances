import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getProviderDetail } from "@/features/providers/queries/get-providers.query";
import { PROVIDER_REGISTRY } from "@/features/providers/lib/provider-registry";
import { ProviderDetailTabs } from "@/features/providers/components/provider-detail-tabs";
import { Badge } from "@/shared/components/ui/badge";

export const metadata = { title: "Provider — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string; providerId: string }> };

export default async function ProviderDetailPage({ params }: PageProps) {
  const { tenantSlug, providerId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "provider", "view");

  const provider = await getProviderDetail(db, providerId);
  if (!provider) notFound();

  const meta = PROVIDER_REGISTRY[provider.type];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/providers`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Providers
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{meta.name}</h1>
          {provider.connection && (
            <Badge variant="secondary">{provider.connection.status.toLowerCase()}</Badge>
          )}
          {provider.connection && (
            <Badge variant="outline">{provider.connection.environment.toLowerCase()}</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{meta.description}</p>
      </div>

      <ProviderDetailTabs
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        provider={provider}
        canManage={can(membership.role, "provider", "manage")}
        canEdit={can(membership.role, "provider", "update")}
        canDelete={can(membership.role, "provider", "delete")}
      />
    </div>
  );
}
