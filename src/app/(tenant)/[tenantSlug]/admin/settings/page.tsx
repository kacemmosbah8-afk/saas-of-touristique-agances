import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getAgencyProfile } from "@/features/settings/queries/settings.query";
import { PublicWebsiteSettingsForm } from "@/features/settings/components/public-website-settings-form";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Settings" };

/**
 * A single-customer build has exactly one settings surface: the public
 * website's editable content (tagline, contact info, hours, socials,
 * testimonials). Team/roles, regional defaults, and CRM tag/category/
 * custom-field configuration were deliberately removed — this is a
 * single-owner login with no admin-editable brand/identity, not a SaaS
 * workspace.
 */
export default async function TenantSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership } = await requirePermissionOrNotFound(tenant.id, "settings", "view");
  const profile = await getAgencyProfile(tenant.id);
  const canEdit = can(membership.role, "settings", "update");
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{dict.settings.pageTitle}</h1>
        <p className="text-muted-foreground text-sm">
          {dict.settings.pageSubtitle} {tenant.name}.
        </p>
      </div>

      <PublicWebsiteSettingsForm
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
        profile={profile}
        canEdit={canEdit}
        locale={locale}
      />
    </div>
  );
}
