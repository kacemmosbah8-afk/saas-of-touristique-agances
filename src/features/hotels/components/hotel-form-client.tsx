"use client";

import { createHotelAction } from "@/features/hotels/actions/create-hotel.action";
import { HotelForm } from "@/features/hotels/components/hotel-form";

/** Client wrapper that binds the create action for the "New Hotel" page. */
export function HotelFormClient({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
  return (
    <HotelForm
      mode="create"
      tenantSlug={tenantSlug}
      onSubmit={(values) => createHotelAction(tenantId, values)}
    />
  );
}
