"use client";

import { createHotelAction } from "@/features/hotels/actions/create-hotel.action";
import { HotelForm } from "@/features/hotels/components/hotel-form";
import { type Locale } from "@/shared/i18n/dictionary";

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
