"use client";

import dynamic from "next/dynamic";

import { createFlightAction } from "@/features/flights/actions/create-flight.action";
import { type Locale } from "@/shared/i18n/dictionary";

const FlightForm = dynamic(
  () => import("@/features/flights/components/flight-form").then((m) => m.FlightForm),
  { ssr: true, loading: () => <div className="bg-muted h-64 w-full animate-pulse rounded-lg" /> },
);

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
