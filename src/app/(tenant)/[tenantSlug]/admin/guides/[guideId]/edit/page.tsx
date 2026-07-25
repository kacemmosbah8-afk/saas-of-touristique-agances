import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/shared/lib/db";
import { requirePermissionOrNotFound } from "@/shared/lib/permissions/guard";
import { getGuide } from "@/features/guides/queries/get-guide.query";
import { GuideFormClient } from "@/features/guides/components/guide-form-client";
import { ResourceStatusBadge } from "@/shared/components/resource-status-badge";

export const metadata = { title: "Edit Guide" };

type PageProps = { params: Promise<{ tenantSlug: string; guideId: string }> };

export default async function EditGuidePage({ params }: PageProps) {
  const { tenantSlug, guideId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) notFound();

  const { db } = await requirePermissionOrNotFound(tenant.id, "guide", "view");

  const guide = await getGuide(db, guideId);
  if (!guide) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${tenantSlug}/admin/guides`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          Tour Guides
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{guide.name}</h1>
          <ResourceStatusBadge status={guide.status} />
        </div>
      </div>

      <GuideFormClient tenantId={tenant.id} tenantSlug={tenantSlug} guide={guide} />
    </div>
  );
}
