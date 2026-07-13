import { Plane } from "lucide-react";

import { requirePortalSession } from "@/features/portal/lib/guard";
import { listPortalBookings } from "@/features/portal/queries/dashboard.query";
import { TripCard } from "@/features/portal/components/trip-card";

export const metadata = { title: "Your trips" };

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function PortalDashboardPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const ctx = await requirePortalSession(tenantSlug);

  const trips = await listPortalBookings(ctx.db, ctx.tenantId, ctx.customerId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your trips</h1>
        <p className="text-muted-foreground text-sm">Everything booked with {ctx.tenantName}, in one place.</p>
      </div>

      {trips.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center text-sm">
          <Plane className="size-8" />
          <p>No trips yet — once {ctx.tenantName} confirms a booking for you, it&apos;ll show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} tenantSlug={tenantSlug} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
