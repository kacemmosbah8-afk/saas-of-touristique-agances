"use client";

import { createLeadAction } from "@/features/leads/actions/lead.action";
import { LeadForm } from "@/features/leads/components/lead-form";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";
import type { Locale } from "@/shared/i18n/dictionary";

export function LeadFormClient({
  tenantId,
  tenantSlug,
  members,
  locale,
}: {
  tenantId: string;
  tenantSlug: string;
  members: MemberOption[];
  locale: Locale;
}) {
  return (
    <LeadForm
      mode="create"
      tenantSlug={tenantSlug}
      members={members}
      locale={locale}
      onSubmit={(values) => createLeadAction(tenantId, values)}
    />
  );
}
