import {
  CalendarPlus,
  CheckCircle2,
  Ticket,
  XCircle,
} from "lucide-react";

import type { PortalTimelineEntry, PortalTimelineEntryType } from "@/features/portal/queries/booking-detail.query";
import { formatDate } from "@/features/portal/lib/format";

const ICONS: Record<PortalTimelineEntryType, React.ComponentType<{ className?: string }>> = {
  BOOKING_CREATED: CalendarPlus,
  BOOKING_CONFIRMED: CheckCircle2,
  BOOKING_CANCELLED: XCircle,
  SUPPLIER_CONFIRMED: CheckCircle2,
  VOUCHER_ISSUED: Ticket,
};

export function BookingTimeline({ entries }: { entries: PortalTimelineEntry[] }) {
  return (
    <ol className="space-y-4">
      {entries.map((entry, i) => {
        const Icon = ICONS[entry.type];
        return (
          <li key={`${entry.type}-${i}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-3.5" />
              </span>
              {i < entries.length - 1 && <span className="bg-border mt-1 w-px flex-1" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium">{entry.title}</p>
              <p className="text-muted-foreground text-xs">{formatDate(entry.occurredAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
