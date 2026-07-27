"use client";

import { createBookingAction, updateBookingAction } from "@/features/bookings/actions/booking.action";
import { BookingForm } from "@/features/bookings/components/booking-form";
import type { BookingDetail } from "@/features/bookings/queries/get-booking.query";
import type {
  CustomerOption,
  PackageOption,
} from "@/features/bookings/queries/booking-options.query";
import type { MemberOption } from "@/features/crm/queries/crm-options.query";
import type { BookingFormInput } from "@/features/bookings/schemas/booking.schema";
import { type Locale } from "@/shared/i18n/dictionary";

type Props = {
  tenantId: string;
  tenantSlug: string;
  customers: CustomerOption[];
  packages: PackageOption[];
  members: MemberOption[];
  booking?: BookingDetail;
  locale: Locale;
};

export function BookingFormClient({
  tenantId,
  tenantSlug,
  customers,
  packages,
  members,
  booking,
  locale,
}: Props) {
  return (
    <BookingForm
      mode={booking ? "edit" : "create"}
      tenantSlug={tenantSlug}
      booking={booking}
      customers={customers}
      packages={packages}
      members={members}
      onSubmit={(values: BookingFormInput) =>
        booking
          ? updateBookingAction(tenantId, booking.id, values)
          : createBookingAction(tenantId, values)
      }
      locale={locale}
    />
  );
}
