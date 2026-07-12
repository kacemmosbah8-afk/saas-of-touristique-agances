import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requireSession, requireTenantMembershipOrNotFound } from "@/shared/lib/permissions/guard";
import { DashboardShell } from "@/features/tenants/components/dashboard-shell";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await requireSession();

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) notFound();

  // Fresh, DB-backed check — see requireTenantMembership for why this
  // cannot be the JWT-cached session.memberships list.
  const { membership } = await requireTenantMembershipOrNotFound(tenant.id);

  return (
    <DashboardShell
      tenantName={tenant.name}
      tenantSlug={tenant.slug}
      userName={session.user.name ?? session.user.email ?? "Account"}
      role={membership.role}
    >
      {children}
    </DashboardShell>
  );
}
