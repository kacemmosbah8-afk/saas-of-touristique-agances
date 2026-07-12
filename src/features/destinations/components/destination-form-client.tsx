"use client";

import { createDestinationAction } from "@/features/destinations/actions/destination.action";
import { DestinationDetailsForm } from "@/features/destinations/components/destination-details-form";

export function DestinationFormClient({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
  return (
    <DestinationDetailsForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createDestinationAction(tenantId, values)}
    />
  );
}
