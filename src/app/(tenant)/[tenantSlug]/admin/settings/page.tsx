import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { listMembers } from "@/features/tenants/queries/list-members.query";
import { listPendingInvitations } from "@/features/tenants/queries/list-pending-invitations.query";
import { MemberList } from "@/features/tenants/components/member-list";
import { InviteMemberForm } from "@/features/tenants/components/invite-member-form";
import { PendingInvitationsList } from "@/features/tenants/components/pending-invitations-list";
import {
  getWorkspaceSettings,
  listTags,
  listTravelCategories,
  listCustomFields,
} from "@/features/settings/queries/settings.query";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";

export const metadata = { title: "Settings" };

export default async function TenantSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(
    tenant.id,
    "settings",
    "view",
  );

  const [members, pendingInvitations, settings, tags, categories, customFields] =
    await Promise.all([
      listMembers(db),
      listPendingInvitations(db),
      getWorkspaceSettings(db),
      listTags(db),
      listTravelCategories(db),
      listCustomFields(db),
    ]);

  const canEdit = can(membership.role, "settings", "update");
  const canInvite = can(membership.role, "invitation", "create");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Team, regional defaults, and configuration for {tenant.name}.
        </p>
      </div>

      <SettingsTabs
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        settings={settings}
        tags={tags}
        categories={categories}
        customFields={customFields}
        canEdit={canEdit}
        teamSlot={
          <div className="space-y-4">
            {canInvite && <InviteMemberForm tenantId={tenant.id} />}
            <PendingInvitationsList
              tenantId={tenant.id}
              invitations={pendingInvitations}
              canManage={canInvite}
            />
            <MemberList members={members} />
          </div>
        }
      />
    </div>
  );
}
