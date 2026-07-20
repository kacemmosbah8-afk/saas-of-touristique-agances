import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PlaneTakeoff, Clock } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { getFlightBySlug } from "@/features/flights/queries/get-flight-by-slug.query";
import { Reveal } from "@/features/public-site/components/reveal";
import { Parallax } from "@/features/public-site/components/parallax";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";

const CABIN_CLASS_LABELS: Record<string, string> = {
  ECONOMY: "Economy",
  PREMIUM_ECONOMY: "Premium Economy",
  BUSINESS: "Business",
  FIRST: "First",
};

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string; flightSlug: string }>;
}) {
  const { tenantSlug, flightSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  const flight = await getFlightBySlug(getTenantDb(tenant.id), flightSlug);
  if (!flight) return {};
  return {
    title: flight.seoTitle || flight.name,
    description: flight.seoDescription || flight.shortDescription || undefined,
  };
}

export default async function PublicFlightDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; flightSlug: string }>;
}) {
  const { tenantSlug, flightSlug } = await params;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const flight = await getFlightBySlug(getTenantDb(tenant.id), flightSlug);
  if (!flight) notFound();

  const duration = formatDuration(flight.durationMinutes);
  const route =
    flight.departureCity && flight.arrivalCity
      ? `${flight.departureCity} → ${flight.arrivalCity}`
      : flight.name;
  const stopsLabel = flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`;
  const bookHref = `/${tenantSlug}/book?flight=${encodeURIComponent(flight.slug)}`;

  return (
    <div>
      {/* Full-bleed hero — the header floats transparent over this */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <div className="bg-muted absolute inset-0 overflow-hidden">
          <Parallax strength={0.15} className="absolute -inset-y-16 inset-x-0">
            {flight.coverImageUrl && (
              <Image
                src={flight.coverImageUrl}
                alt={route}
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
            )}
          </Parallax>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-4 pt-32 pb-14 text-white sm:px-6 sm:pb-20">
          <Link
            href={`/${tenantSlug}/flights`}
            className="mb-5 inline-block text-sm text-white/70 hover:text-white"
          >
            ← Flights
          </Link>
          {flight.airline && (
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">
              {flight.airline}
              {flight.flightNumber ? ` · ${flight.flightNumber}` : ""}
            </p>
          )}
          <h1 className="text-[clamp(2.2rem,6vw,4.2rem)] leading-[1] font-semibold tracking-tight text-balance">
            {route}
          </h1>
          {flight.shortDescription && (
            <p className="mt-4 max-w-xl text-lg text-white/85">{flight.shortDescription}</p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          {flight.description ? (
            <Reveal className="max-w-2xl">
              <p className="text-lg leading-relaxed whitespace-pre-line">{flight.description}</p>
            </Reveal>
          ) : (
            <span />
          )}
          <Reveal className="flex flex-col items-end gap-3">
            {flight.basePrice != null && (
              <p className="text-2xl font-semibold">
                {flight.currency} {flight.basePrice.toLocaleString()}
              </p>
            )}
            <Button asChild size="lg" className="text-base">
              <Link href={bookHref}>Request to Book</Link>
            </Button>
          </Reveal>
        </div>

        {/* Route details — departure / arrival */}
        <Reveal className="mt-14">
          <div className="grid gap-6 rounded-2xl border p-6 sm:grid-cols-2 sm:p-8">
            <div className="flex items-start gap-4">
              <PlaneTakeoff className="text-primary mt-1 size-5 shrink-0" />
              <div>
                <p className="text-brand-sage text-xs font-semibold tracking-[0.14em] uppercase">
                  Departure
                </p>
                <p className="mt-1 font-serif text-xl font-semibold">{flight.departureCity || "—"}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {[flight.departureAirport, flight.departureTime].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <PlaneTakeoff className="text-primary mt-1 size-5 shrink-0 rotate-90" />
              <div>
                <p className="text-brand-sage text-xs font-semibold tracking-[0.14em] uppercase">
                  Arrival
                </p>
                <p className="mt-1 font-serif text-xl font-semibold">{flight.arrivalCity || "—"}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {[flight.arrivalAirport, flight.arrivalTime].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Metadata row — duration / stops / cabin */}
        <Reveal delay={60} className="text-muted-foreground mt-6 flex flex-wrap items-center gap-4 text-sm">
          {duration && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {duration}
            </span>
          )}
          <span>{stopsLabel}</span>
          {flight.cabinClass && (
            <Badge variant="secondary">{CABIN_CLASS_LABELS[flight.cabinClass] ?? flight.cabinClass}</Badge>
          )}
        </Reveal>

        {flight.images.length > 0 && (
          <Reveal className="mt-14">
            <div className="grid auto-rows-[160px] grid-cols-3 gap-3 sm:auto-rows-[220px] sm:gap-4">
              {flight.images.map((img, i) => (
                <div
                  key={img.id}
                  className={`bg-muted relative overflow-hidden rounded-xl ${
                    i % 5 === 0 ? "col-span-2 row-span-2" : "col-span-1"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt || route}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 300px"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        )}

        <Reveal as="section" className="mt-16 rounded-2xl border p-10 text-center sm:p-14">
          <p className="font-serif text-2xl font-semibold text-balance">Interested in this flight?</p>
          <p className="text-muted-foreground mt-2">
            Send a booking request and we&apos;ll confirm availability and pricing with you directly.
          </p>
          <Button asChild className="mt-6 text-base" size="lg">
            <Link href={bookHref}>Request to Book</Link>
          </Button>
          <p className="text-muted-foreground mt-4 text-sm">
            Just have a question?{" "}
            <Link
              href={`/${tenantSlug}/contact?flight=${encodeURIComponent(flight.slug)}`}
              className="text-foreground underline underline-offset-2"
            >
              Contact us
            </Link>{" "}
            instead.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
