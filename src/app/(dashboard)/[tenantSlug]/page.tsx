import { notFound } from "next/navigation";

import { requireTenantMembershipOrNotFound } from "@/shared/lib/permissions/guard";
import { prisma } from "@/shared/lib/db";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) notFound();

  const { membership } = await requireTenantMembershipOrNotFound(tenant.id);

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to {tenant.name}</CardTitle>
          <CardDescription>
            Signed in as {membership.role.toLowerCase()}. Your workspace is
            ready — business modules (bookings, CRM, finance, ...) will land
            here in upcoming milestones.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
