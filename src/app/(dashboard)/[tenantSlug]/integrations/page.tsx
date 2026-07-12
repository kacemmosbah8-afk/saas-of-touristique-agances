import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshCw, ScrollText } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import {
  getIntegrationsOverview,
  getImportedDataCounts,
} from "@/features/integrations/queries/integrations.query";
import { IntegrationCard } from "@/features/integrations/components/integration-card";
import { Button } from "@/shared/components/ui/button";

export const metadata = { title: "Integrations — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function IntegrationsPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "provider", "view");

  const [integrations, counts] = await Promise.all([
    getIntegrationsOverview(db),
    getImportedDataCounts(db),
  ]);

  const connected = integrations.filter((i) => i.connectionStatus === "CONNECTED").length;
  const configured = integrations.filter((i) => i.configured).length;

  const countItems = [
    { label: "Countries", value: counts.countries },
    { label: "Cities", value: counts.cities },
    { label: "Hotels (imported)", value: counts.hotels },
    { label: "Amenities", value: counts.amenities },
    { label: "Airports", value: counts.airports },
    { label: "Airlines", value: counts.airlines },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Integrations</h1>
          <p className="text-muted-foreground text-sm">
            {configured} of {integrations.length} configured · {connected} connected. Credentials
            are read from environment variables only.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${tenantSlug}/integrations/sync`}>
            <Button size="sm" variant="outline">
              <RefreshCw className="mr-1.5 size-4" />
              Sync
            </Button>
          </Link>
          <Link href={`/${tenantSlug}/integrations/logs`}>
            <Button size="sm" variant="outline">
              <ScrollText className="mr-1.5 size-4" />
              Logs
            </Button>
          </Link>
          <Link href={`/${tenantSlug}/providers`}>
            <Button size="sm" variant="ghost">
              All providers
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.type}
            tenantId={tenant.id}
            tenantSlug={tenantSlug}
            integration={integration}
            canEdit={can(membership.role, "provider", "update")}
            canManage={can(membership.role, "provider", "manage")}
          />
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium">Imported Reference Data</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {countItems.map((item) => (
            <div key={item.label} className="rounded-lg border p-3">
              <p className="text-xl font-semibold tabular-nums">{item.value.toLocaleString()}</p>
              <p className="text-muted-foreground text-xs">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
