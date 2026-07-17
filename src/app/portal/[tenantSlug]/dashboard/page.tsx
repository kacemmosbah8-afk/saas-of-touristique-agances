import { Plane } from "lucide-react";

import { requirePortalSession } from "@/features/portal/lib/guard";
import { listPortalBookings } from "@/features/portal/queries/dashboard.query";
import { TripCard } from "@/features/portal/components/trip-card";
import { EmptyState } from "@/shared/components/empty-state";

export const metadata = { title: "Your trips" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function PortalDashboardPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const ctx = await requirePortalSession(tenantSlug);

  const trips = await listPortalBookings(ctx.db, ctx.tenantId, ctx.customerId);

  // Presentation-only grouping: what's ahead (or being planned) first, past
  // and cancelled trips tucked below — the traveler's next trip should be
  // the first thing on screen, not their 2019 one.
  const current = trips.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
  const past = trips.filter((t) => t.status === "COMPLETED" || t.status === "CANCELLED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your trips</h1>
        <p className="text-muted-foreground text-sm">Everything booked with {ctx.tenantName}, in one place.</p>
      </div>

      {trips.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="No trips yet"
          description={`Once ${ctx.tenantName} confirms a booking for you, it'll show up here.`}
        />
      ) : (
        <>
          <div className="space-y-3">
            {current.map((trip) => (
              <TripCard key={trip.id} tenantSlug={tenantSlug} trip={trip} />
            ))}
            {current.length === 0 && (
              <EmptyState
                icon={Plane}
                title="Nothing coming up"
                description={`Your next booking with ${ctx.tenantName} will appear here.`}
                className="py-10"
              />
            )}
          </div>

          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-muted-foreground text-sm font-medium">Past &amp; cancelled trips</h2>
              {past.map((trip) => (
                <TripCard key={trip.id} tenantSlug={tenantSlug} trip={trip} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
