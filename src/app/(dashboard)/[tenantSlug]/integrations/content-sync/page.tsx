import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { isProviderConfiguredForTenant } from "@/features/integrations/lib/resolve-credentials";
import { getContentSyncStatus } from "@/features/content-sync/queries/content-sync.query";
import { ContentSyncPanel } from "@/features/content-sync/components/content-sync-panel";
import { Badge } from "@/shared/components/ui/badge";

export const metadata = { title: "Content Sync — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function ContentSyncPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db, membership } = await requirePermissionOrNotFound(tenant.id, "provider", "view");
  const canManage = can(membership.role, "provider", "manage");
  const { configured } = await isProviderConfiguredForTenant(db, tenant.id, "TRAVELPAYOUTS");
  const status = await getContentSyncStatus(db);

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
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Content Sync</h1>
          <Badge variant={configured ? "secondary" : "outline"}>
            {configured ? "Configured" : "Awaiting credentials"}
          </Badge>
          {status.settings.enabled && <Badge variant="secondary">Scheduler enabled</Badge>}
        </div>
        <p className="text-muted-foreground text-sm">
          Synchronizes hotels, destinations, cities, countries, images, and amenities from
          TravelPayouts into your local catalogue. The public website and every dashboard page read
          only from this local data — never from TravelPayouts directly.
        </p>
      </div>

      <ContentSyncPanel tenantId={tenant.id} configured={configured} canManage={canManage} status={status} />
    </div>
  );
}
