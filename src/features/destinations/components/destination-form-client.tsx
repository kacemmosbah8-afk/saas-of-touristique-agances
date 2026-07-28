"use client";

import { createDestinationAction } from "@/features/destinations/actions/destination.action";
import { DestinationDetailsForm } from "@/features/destinations/components/destination-details-form";
import { type Locale } from "@/shared/i18n/dictionary";

export function DestinationFormClient({
  tenantId,
  tenantSlug,
  locale,
}: {
  tenantId: string;
  tenantSlug: string;
  locale: Locale;
}) {
  return (
    <DestinationDetailsForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createDestinationAction(tenantId, values)}
      locale={locale}
    />
  );
}
