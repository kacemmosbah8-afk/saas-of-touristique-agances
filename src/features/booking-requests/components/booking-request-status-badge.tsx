import type { BookingRequestStatus } from "@prisma/client";

import { BOOKING_REQUEST_STATUS_LABELS } from "@/features/booking-requests/lib/status";
import { StatusBadge } from "@/shared/components/status-badge";
import type { StatusTone } from "@/shared/lib/status-tone";

const TONE: Record<BookingRequestStatus, StatusTone> = {
  PENDING: "warning",
  CONTACTED: "info",
  CONFIRMED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export function BookingRequestStatusBadge({ status }: { status: BookingRequestStatus }) {
  return <StatusBadge tone={TONE[status]}>{BOOKING_REQUEST_STATUS_LABELS[status]}</StatusBadge>;
}
