import type { BookingStatus } from "@prisma/client";

import { StatusBadge } from "@/shared/components/status-badge";
import type { StatusTone } from "@/shared/lib/status-tone";

/**
 * Traveler-facing booking status — deliberately NOT a reuse of the staff
 * `BookingStatusBadge`. Staff semantics don't translate: "Draft" is an
 * internal pipeline word (a traveler's trip is "being planned"), and the
 * staff tone map paints IN_PROGRESS amber (an attention colour for
 * operators) which would read as "something is wrong" to a customer who is
 * literally on the trip right now.
 */
const PORTAL_STATUS: Record<BookingStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: "Being planned", tone: "neutral" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  IN_PROGRESS: { label: "Travelling now", tone: "info" },
  COMPLETED: { label: "Completed", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

export function TripStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const { label, tone } = PORTAL_STATUS[status];
  return (
    <StatusBadge tone={tone} className={className}>
      {label}
    </StatusBadge>
  );
}
