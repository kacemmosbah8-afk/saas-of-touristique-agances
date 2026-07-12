"use client";

import { createLeadAction } from "@/features/leads/actions/lead.action";
import { LeadForm } from "@/features/leads/components/lead-form";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";

export function LeadFormClient({
  tenantId,
  tenantSlug,
  members,
}: {
  tenantId: string;
  tenantSlug: string;
  members: MemberOption[];
}) {
  return (
    <LeadForm
      mode="create"
      tenantSlug={tenantSlug}
      members={members}
      onSubmit={(values) => createLeadAction(tenantId, values)}
    />
  );
}
