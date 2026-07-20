import { notFound } from "next/navigation";

import { getCachedTenant } from "@/shared/lib/db";
import { getAgencyProfile } from "@/features/settings/queries/settings.query";
import { SiteHeader } from "@/features/public-site/components/site-header";
import { SiteFooter } from "@/features/public-site/components/site-footer";

/**
 * The agency's public storefront — the default, unauthenticated experience
 * at `/[tenantSlug]`. Sibling to `[tenantSlug]/admin`, which carries its
 * own session-gated layout; this one never requires a session. Everything
 * rendered here (name, logo, contact info) comes from the tenant's own
 * data — there is no TravelOS-branded fallback.
 */
export default async function PublicSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const profile = await getAgencyProfile(tenant.id);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader tenantSlug={tenantSlug} agencyName={tenant.name} logoUrl={profile.logoUrl || null} />
      <main className="flex-1">{children}</main>
      <SiteFooter tenantSlug={tenantSlug} agencyName={tenant.name} profile={profile} />
    </div>
  );
}
