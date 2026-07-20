"use client";

import { createCustomerAction } from "@/features/crm/actions/customer.action";
import { CustomerForm } from "@/features/crm/components/customer-form";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";

export function CustomerFormClient({
  tenantId,
  tenantSlug,
  members,
}: {
  tenantId: string;
  tenantSlug: string;
  members: MemberOption[];
}) {
  return (
    <CustomerForm
      mode="create"
      tenantId={tenantId}
      tenantSlug={tenantSlug}
      members={members}
      onSubmit={(values) => createCustomerAction(tenantId, values)}
    />
  );
}
