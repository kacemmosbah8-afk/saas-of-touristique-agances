"use client";

import { createCustomerAction } from "@/features/crm/actions/customer.action";
import { CustomerForm } from "@/features/crm/components/customer-form";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";
import { type Locale } from "@/shared/i18n/dictionary";

export function CustomerFormClient({
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
    <CustomerForm
      mode="create"
      tenantId={tenantId}
      tenantSlug={tenantSlug}
      members={members}
      onSubmit={(values) => createCustomerAction(tenantId, values)}
      locale={locale}
    />
  );
}
