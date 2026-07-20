import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, PlaneTakeoff, Clock } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { listFlights } from "@/features/flights/queries/list-flights.query";
import { Reveal } from "@/features/public-site/components/reveal";
import { cn } from "@/shared/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  return { title: `Flights — ${tenant.name}` };
}

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default async function PublicFlightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { tenantSlug } = await params;
  const { q, page } = await searchParams;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const result = await listFlights(getTenantDb(tenant.id), {
    status: "PUBLISHED",
    search: q || undefined,
    page: page ? Number(page) || 1 : 1,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
        <div>
          <p className="text-brand-sage mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
            {result.total} {result.total === 1 ? "route" : "routes"} available
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Flights</h1>
        </div>
        <form className="border-border/70 flex w-full max-w-xs items-center gap-2 border-b pb-2 sm:w-auto" method="get">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search routes, airlines, cities…"
            className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
          />
        </form>
      </div>

      {result.flights.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-16 text-center">
          {q ? "No flights match your search." : "No flights published yet. Check back soon."}
        </p>
      ) : (
        <div className="grid auto-rows-[240px] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {result.flights.map((flight, i) => {
            const tall = i % 5 === 0;
            const duration = formatDuration(flight.durationMinutes);
            const route =
              flight.departureCity && flight.arrivalCity
                ? `${flight.departureCity} → ${flight.arrivalCity}`
                : flight.name;

            return (
              <Reveal
                key={flight.id}
                delay={(i % 8) * 60}
                className={cn("col-span-2 sm:col-span-1", tall && "row-span-2 sm:col-span-2")}
              >
                <Link
                  href={`/${tenantSlug}/flights/${flight.slug}`}
                  className="group relative flex h-full w-full flex-col justify-end overflow-hidden rounded-2xl"
                >
                  <div className="bg-muted absolute inset-0">
                    {flight.coverImageUrl ? (
                      <Image
                        src={flight.coverImageUrl}
                        alt={route}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes={tall ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 100vw, 25vw"}
                      />
                    ) : (
                      <div className="text-muted-foreground/40 flex h-full items-center justify-center">
                        <PlaneTakeoff className="size-10" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent transition-opacity group-hover:from-black/90" />
                  <div className="relative p-4 sm:p-5">
                    {flight.airline && (
                      <p className="mb-1 text-xs font-medium tracking-wide text-white/70 uppercase">
                        {flight.airline}
                      </p>
                    )}
                    <p
                      className={cn(
                        "font-serif font-semibold text-balance text-white",
                        tall ? "text-2xl sm:text-3xl" : "text-lg",
                      )}
                    >
                      {route}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
                      {duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {duration}
                        </span>
                      )}
                      <span>{flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}</span>
                      {flight.basePrice != null && (
                        <span className="font-semibold text-white">
                          {flight.currency} {flight.basePrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
