import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { resolveTenantCredentials } from "@/features/integrations/lib/resolve-credentials";
import { HotelbedsExplorer } from "@/features/integrations/components/hotelbeds-explorer";
import { Badge } from "@/shared/components/ui/badge";

export const metadata = { title: "Hotelbeds — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function HotelbedsPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "provider", "view");
  const resolved = await resolveTenantCredentials(db, tenant.id, "HOTELBEDS");
  const configured = resolved.configured;
  const environment =
    resolved.configured && resolved.provider.type === "HOTELBEDS"
      ? resolved.provider.credentials.environment
      : "test";

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
          <h1 className="text-xl font-semibold">Hotelbeds</h1>
          <Badge variant={configured ? "secondary" : "outline"}>
            {configured ? `Connected (${environment})` : "Not configured"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Hotel availability, destination content, activities, and transfers.
        </p>
      </div>

      {configured ? (
        <HotelbedsExplorer tenantId={tenant.id} />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          Connect your agency&rsquo;s Hotelbeds account in{" "}
          <a href={`/${tenantSlug}/integrations`} className="text-primary underline underline-offset-2">
            Integrations
          </a>{" "}
          to use this integration.
        </p>
      )}
    </div>
  );
}
