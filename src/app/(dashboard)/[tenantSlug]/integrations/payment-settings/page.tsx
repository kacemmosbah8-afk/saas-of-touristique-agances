import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { isProviderConfiguredForTenant } from "@/features/integrations/lib/resolve-credentials";
import { getPaymentConfiguration } from "@/features/payment-config/queries/payment-config.query";
import { PaymentSettingsPanel } from "@/features/payment-config/components/payment-settings-panel";
import { PROVIDER_REGISTRY } from "@/features/providers/lib/provider-registry";

export const metadata = { title: "Payment Settings — TravelOS" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function PaymentSettingsPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db, membership } = await requirePermissionOrNotFound(tenant.id, "provider", "view");
  const canManage = can(membership.role, "provider", "manage");

  const { configured, source } = await isProviderConfiguredForTenant(db, tenant.id, "DUFFEL");
  const configuration = await getPaymentConfiguration(db, tenant.id, "DUFFEL");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/integrations`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Integrations
        </Link>
        <h1 className="text-xl font-semibold">Payment Settings</h1>
        <p className="text-muted-foreground text-sm">
          Controls how {PROVIDER_REGISTRY.DUFFEL.name} is asked to pay for confirmed flight
          bookings. Independent of which {PROVIDER_REGISTRY.DUFFEL.name} account is connected —
          see Integrations for that.
        </p>
      </div>

      {configured ? (
        <PaymentSettingsPanel
          tenantId={tenant.id}
          provider="DUFFEL"
          providerName={PROVIDER_REGISTRY.DUFFEL.name}
          configuration={configuration}
          credentialSource={source}
          canManage={canManage}
        />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
          Connect a {PROVIDER_REGISTRY.DUFFEL.name} account in{" "}
          <Link href={`/${tenantSlug}/integrations`} className="text-primary underline underline-offset-2">
            Integrations
          </Link>{" "}
          before configuring how it pays.
        </p>
      )}
    </div>
  );
}
