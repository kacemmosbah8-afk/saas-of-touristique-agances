"use client";

import { createCustomerAction } from "@/features/crm/actions/customer.action";
import { CustomerForm } from "@/features/crm/components/customer-form";
import type { CompanyOption, MemberOption } from "@/features/crm/queries/crm-options.query";

export function CustomerFormClient({
  tenantId,
  tenantSlug,
  companies,
  members,
}: {
  tenantId: string;
  tenantSlug: string;
  companies: CompanyOption[];
  members: MemberOption[];
}) {
  return (
    <CustomerForm
      mode="create"
      tenantId={tenantId}
      tenantSlug={tenantSlug}
      companies={companies}
      members={members}
      onSubmit={(values) => createCustomerAction(tenantId, values)}
    />
  );
}
