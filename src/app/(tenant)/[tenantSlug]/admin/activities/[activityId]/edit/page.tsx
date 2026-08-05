import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { getActivity } from "@/features/activities/queries/get-activity.query";
import { getSupplierOptions } from "@/features/suppliers/queries/supplier-options.query";
import { ActivityEditTabs } from "@/features/activities/components/activity-edit-tabs";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { getAdminDictionary } from "@/shared/i18n/admin-dictionary";

export const metadata = { title: "Edit Activity" };

type PageProps = { params: Promise<{ tenantSlug: string; activityId: string }> };

export default async function EditActivityPage({ params }: PageProps) {
  const { tenantSlug, activityId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { membership, db } = await requirePermissionOrNotFound(tenant.id, "activity", "view");

  const [activity, suppliers] = await Promise.all([
    getActivity(db, activityId),
    getSupplierOptions(db),
  ]);
  if (!activity) notFound();

  const canEdit = can(membership.role, "activity", "update");
  const locale = await getVisitorLocale();
  const dict = getAdminDictionary(locale).activities;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/activities`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {dict.pageTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{activity.name}</h1>
          <ResourceStatusBadge status={activity.status} />
        </div>
        {activity.status === "ACTIVE" ? (
          <a
            href={`/${tenantSlug}/activities/${activity.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary text-sm underline underline-offset-2"
          >
            {dict.viewOnPublicSite}
          </a>
        ) : (
          <p className="text-muted-foreground text-sm">{dict.notLiveYet}</p>
        )}
      </div>

      <ActivityEditTabs
        tenantId={tenant.id}
        tenantSlug={tenantSlug}
        activity={activity}
        suppliers={suppliers}
        canEdit={canEdit}
        locale={locale}
      />
    </div>
  );
}
