"use client";

import dynamic from "next/dynamic";

import { createHotelAction } from "@/features/hotels/actions/create-hotel.action";
import { type Locale } from "@/shared/i18n/dictionary";

const HotelForm = dynamic(
  () => import("@/features/hotels/components/hotel-form").then((m) => m.HotelForm),
  { ssr: true, loading: () => <div className="bg-muted h-64 w-full animate-pulse rounded-lg" /> },
);

/** Client wrapper that binds the create action for the "New Hotel" page. */
export function HotelFormClient({
  tenantId,
  tenantSlug,
  locale,
}: {
  tenantId: string;
  tenantSlug: string;
  locale: Locale;
}) {
  return (
    <HotelForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createHotelAction(tenantId, values)}
      locale={locale}
    />
  );
}
