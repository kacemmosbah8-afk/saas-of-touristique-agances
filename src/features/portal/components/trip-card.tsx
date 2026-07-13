import Link from "next/link";
import { CalendarDays, ChevronRight, Users } from "lucide-react";

import type { PortalBookingSummary } from "@/features/portal/queries/dashboard.query";
import { BOOKING_STATUS_LABELS } from "@/features/bookings/lib/status";
import { formatDate, formatMoney } from "@/features/portal/lib/format";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  CONFIRMED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  IN_PROGRESS: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export function TripCard({ tenantSlug, trip }: { tenantSlug: string; trip: PortalBookingSummary }) {
  return (
    <Link href={`/portal/${tenantSlug}/bookings/${trip.id}`}>
      <Card className="group hover:border-primary/40 relative overflow-hidden p-0 transition-colors">
        <div className={cn("h-1.5 w-full", trip.status === "CANCELLED" ? "bg-destructive/60" : "bg-primary/70")} />
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-semibold">{trip.tripSummary}</p>
              <Badge variant="outline" className={cn("border-0", STATUS_STYLE[trip.status])}>
                {BOOKING_STATUS_LABELS[trip.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">{trip.reference}</p>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {trip.travelStartDate && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {formatDate(trip.travelStartDate)}
                  {trip.travelEndDate ? ` – ${formatDate(trip.travelEndDate)}` : ""}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" />
                {trip.adults + trip.children} traveller{trip.adults + trip.children === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{formatMoney(trip.total, trip.currency)}</p>
              {trip.balanceDue > 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {formatMoney(trip.balanceDue, trip.currency)} due
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">Paid in full</p>
              )}
            </div>
            <ChevronRight className="text-muted-foreground group-hover:text-foreground size-5 transition-colors" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
