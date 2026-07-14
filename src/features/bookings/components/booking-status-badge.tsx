import type { BookingStatus } from "@prisma/client";

import { BOOKING_STATUS_LABELS } from "@/features/bookings/lib/status";
import { StatusBadge } from "@/shared/components/status-badge";
import type { StatusTone } from "@/shared/lib/status-tone";

const TONE: Record<BookingStatus, StatusTone> = {
  DRAFT: "neutral",
  CONFIRMED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <StatusBadge tone={TONE[status]}>{BOOKING_STATUS_LABELS[status]}</StatusBadge>;
}
