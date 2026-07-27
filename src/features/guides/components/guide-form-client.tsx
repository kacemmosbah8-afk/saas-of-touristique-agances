"use client";

import { createGuideAction, updateGuideAction } from "@/features/guides/actions/guide.action";
import { GuideForm } from "@/features/guides/components/guide-form";
import type { GuideDetail } from "@/features/guides/queries/get-guide.query";
import { type Locale } from "@/shared/i18n/dictionary";

export function GuideFormClient({
  tenantId,
  tenantSlug,
  guide,
  locale,
}: {
  tenantId: string;
  tenantSlug: string;
  guide?: GuideDetail;
  locale: Locale;
}) {
  if (guide) {
    return (
      <GuideForm
        mode="edit"
        tenantSlug={tenantSlug}
        guide={guide}
        onSubmit={(values) => updateGuideAction(tenantId, guide.id, values)}
        locale={locale}
      />
    );
  }
  return (
    <GuideForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createGuideAction(tenantId, values)}
      locale={locale}
    />
  );
}
