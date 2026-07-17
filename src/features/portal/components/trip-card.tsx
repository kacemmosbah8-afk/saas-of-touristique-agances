import Link from "next/link";
import { CalendarDays, ChevronRight, Users } from "lucide-react";

import type { PortalBookingSummary } from "@/features/portal/queries/dashboard.query";
import { formatDate, formatMoney } from "@/features/portal/lib/format";
import { TripStatusBadge } from "@/features/portal/components/trip-status-badge";
import { Card } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

/**
 * One trip in the traveler's dashboard list. Hierarchy is deliberate:
 * where you're going is the headline; reference, dates and status are
 * secondary; money sits right-aligned like a receipt line. The whole card
 * is the tap target — important on phones, where this list is mostly read.
 */
export function TripCard({ tenantSlug, trip }: { tenantSlug: string; trip: PortalBookingSummary }) {
  const travellers = trip.adults + trip.children;

  return (
    <Link href={`/portal/${tenantSlug}/bookings/${trip.id}`} className="group block">
      <Card className="group-hover:border-primary/40 relative gap-0 overflow-hidden p-0 transition-all group-hover:shadow-md">
        <div
          className={cn("h-1.5 w-full", trip.status === "CANCELLED" ? "bg-destructive/60" : "bg-primary/70")}
          aria-hidden="true"
        />
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate text-base font-semibold">{trip.tripSummary}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <TripStatusBadge status={trip.status} />
              <span className="text-muted-foreground text-xs tabular-nums">{trip.reference}</span>
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {trip.travelStartDate && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                  {formatDate(trip.travelStartDate)}
                  {trip.travelEndDate ? ` – ${formatDate(trip.travelEndDate)}` : ""}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5 shrink-0" aria-hidden="true" />
                {travellers} traveller{travellers === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{formatMoney(trip.total, trip.currency)}</p>
              {trip.balanceDue > 0 ? (
                <p className="text-xs font-medium text-amber-600 tabular-nums dark:text-amber-400">
                  {formatMoney(trip.balanceDue, trip.currency)} due
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">Paid in full</p>
              )}
            </div>
            <ChevronRight
              className="text-muted-foreground group-hover:text-foreground size-5 transition-colors"
              aria-hidden="true"
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
