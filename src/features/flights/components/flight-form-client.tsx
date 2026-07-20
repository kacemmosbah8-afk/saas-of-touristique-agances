"use client";

import { createFlightAction } from "@/features/flights/actions/create-flight.action";
import { FlightForm } from "@/features/flights/components/flight-form";

export function FlightFormClient({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
  return (
    <FlightForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createFlightAction(tenantId, values)}
    />
  );
}
