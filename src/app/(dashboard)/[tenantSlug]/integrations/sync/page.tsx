import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listSyncHistory } from "@/features/integrations/queries/logs.query";
import { getImportedDataCounts } from "@/features/integrations/queries/integrations.query";
import { SyncManager } from "@/features/integrations/components/sync-manager";

export const metadata = { title: "Sync — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function SyncPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "provider", "view");

  const [history, counts] = await Promise.all([
    listSyncHistory(db),
    getImportedDataCounts(db),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/integrations`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Integrations
        </Link>
        <h1 className="text-xl font-semibold">Data Synchronization</h1>
        <p className="text-muted-foreground text-sm">
          Import provider reference data into your workspace: {counts.countries} countries,{" "}
          {counts.cities} cities, {counts.airports} airports, {counts.airlines} airlines,{" "}
          {counts.amenities} amenities, {counts.hotels} imported hotels. Manual runs today; the
          same pipeline will back scheduled syncs.
        </p>
      </div>

      <SyncManager
        tenantId={tenant.id}
        history={history}
        canSync={can(membership.role, "provider", "update")}
      />
    </div>
  );
}
