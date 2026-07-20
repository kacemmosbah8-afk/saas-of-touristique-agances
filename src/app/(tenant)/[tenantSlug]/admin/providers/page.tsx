import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listProviders } from "@/features/providers/queries/get-providers.query";
import { ProviderDashboard } from "@/features/providers/components/provider-dashboard";

export const metadata = { title: "Providers — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function ProvidersPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "provider", "view");

  const providers = await listProviders(db);
  const connected = providers.filter((p) => p.connectionStatus === "CONNECTED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Integration Providers</h1>
        <p className="text-muted-foreground text-sm">
          {providers.filter((p) => p.enabled).length} enabled · {connected} connected. Configure
          connections now — live API traffic will be switched on in a later milestone.
        </p>
      </div>

      <ProviderDashboard
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        providers={providers}
        canCreate={can(membership.role, "provider", "create")}
      />
    </div>
  );
}
