import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { listMembers } from "@/features/tenants/queries/list-members.query";
import { MemberList } from "@/features/tenants/components/member-list";

export const metadata = { title: "Settings — TravelOS" };

export default async function TenantSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "membership", "view");
  const members = await listMembers(db);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-muted-foreground text-sm">
          Everyone with access to {tenant.name}.
        </p>
      </div>
      <MemberList members={members} />
    </div>
  );
}
