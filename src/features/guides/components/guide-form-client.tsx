"use client";

import { createGuideAction, updateGuideAction } from "@/features/guides/actions/guide.action";
import { GuideForm } from "@/features/guides/components/guide-form";
import type { GuideDetail } from "@/features/guides/queries/get-guide.query";

export function GuideFormClient({
  tenantId,
  tenantSlug,
  guide,
}: {
  tenantId: string;
  tenantSlug: string;
  guide?: GuideDetail;
}) {
  if (guide) {
    return (
      <GuideForm
        mode="edit"
        tenantSlug={tenantSlug}
        guide={guide}
        onSubmit={(values) => updateGuideAction(tenantId, guide.id, values)}
      />
    );
  }
  return (
    <GuideForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createGuideAction(tenantId, values)}
    />
  );
}
