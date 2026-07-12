import type { BookingStatus } from "@prisma/client";

import { BOOKING_STATUS_LABELS } from "@/features/bookings/lib/status";
import { cn } from "@/shared/lib/utils";

const STYLES: Record<BookingStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  CONFIRMED: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  IN_PROGRESS: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}
