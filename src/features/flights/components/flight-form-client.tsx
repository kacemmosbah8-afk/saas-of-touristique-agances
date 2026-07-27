"use client";

import { createFlightAction } from "@/features/flights/actions/create-flight.action";
import { FlightForm } from "@/features/flights/components/flight-form";
import { type Locale } from "@/shared/i18n/dictionary";

export function FlightFormClient({
  tenantId,
  tenantSlug,
  locale,
}: {
  tenantId: string;
  tenantSlug: string;
  locale: Locale;
}) {
  return (
    <FlightForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createFlightAction(tenantId, values)}
      locale={locale}
    />
  );
}
