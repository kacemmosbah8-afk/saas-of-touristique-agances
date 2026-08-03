import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/shared/lib/db";
import { requireSession, requireTenantMembershipOrNotFound } from "@/shared/lib/permissions/guard";
import { DashboardShell } from "@/features/tenants/components/dashboard-shell";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { localeDir } from "@/shared/i18n/dictionary";

// Authenticated workspace data — never indexed, regardless of the public
// marketing site's defaults in the root layout.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await requireSession();

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  // Fresh, DB-backed check — see requireTenantMembership for why this
  // cannot be the JWT-cached session.memberships list.
  const { membership } = await requireTenantMembershipOrNotFound(tenant.id);
  const locale = await getVisitorLocale();

  return (
    <div dir={localeDir[locale]} lang={locale}>
      <DashboardShell
        tenantName={tenant.name}
        tenantSlug={tenant.slug}
        userName={session.user.name ?? session.user.email ?? "Account"}
        role={membership.role}
        locale={locale}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
