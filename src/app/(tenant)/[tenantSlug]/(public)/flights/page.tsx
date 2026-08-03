import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, PlaneTakeoff, Clock, ArrowUpRight } from "lucide-react";

import { getCachedTenant } from "@/shared/lib/db";
import { listPublicFlights } from "@/features/public-site/lib/public-cache";
import { Reveal } from "@/features/public-site/components/reveal";
import { cn } from "@/shared/lib/utils";
import { getDictionary, localeDir, plural, type Dictionary } from "@/shared/i18n/dictionary";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { localize } from "@/shared/lib/i18n/localize";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  const locale = await getVisitorLocale();
  const dict = getDictionary(locale);
  return { title: `${dict.listing.flights.title} — ${tenant.name}` };
}

function formatDuration(minutes: number | null, dict: Dictionary) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0
    ? `${h}${dict.product.hourAbbr} ${m}${dict.product.minuteAbbr}`
    : `${h}${dict.product.hourAbbr}`;
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

  const locale = await getVisitorLocale();
  const dict = getDictionary(locale);
  // The route arrow is a directional glyph, not decoration — like the
  // reading-progression arrows elsewhere, it has to visually point from
  // departure to arrival, which is the opposite physical direction in RTL.
  const routeArrow = localeDir[locale] === "rtl" ? "←" : "→";

  const result = await listPublicFlights(tenant.id, {
    status: "PUBLISHED",
    search: q || undefined,
    page: page ? Number(page) || 1 : 1,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
        <div>
          <p className="text-brand-sage mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
            {result.total} {plural(result.total, dict.listing.flights.kickerOne, dict.listing.flights.kickerOther)}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{dict.listing.flights.title}</h1>
          <p className="text-muted-foreground mt-3 max-w-xl">{dict.listing.flights.description}</p>
        </div>
        <form className="border-border/70 flex w-full max-w-xs items-center gap-2 border-b pb-2 sm:w-auto" method="get">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={dict.listing.flights.searchPlaceholder}
            className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
          />
        </form>
      </div>

      {result.flights.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-16 text-center">
          {q ? dict.listing.flights.emptySearch : dict.listing.flights.emptyDefault}
        </p>
      ) : (
        <div className="grid auto-rows-[240px] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {result.flights.map((flight, i) => {
            const tall = i % 5 === 0;
            const duration = formatDuration(flight.durationMinutes, dict);
            const name = localize(locale, flight.name, flight.nameFr);
            const departureCity = localize(locale, flight.departureCity ?? "", flight.departureCityFr);
            const arrivalCity = localize(locale, flight.arrivalCity ?? "", flight.arrivalCityFr);
            const route = departureCity && arrivalCity ? `${departureCity} → ${arrivalCity}` : name;
            const stopsLabel =
              flight.stops === 0
                ? dict.product.direct
                : `${flight.stops} ${plural(flight.stops, dict.product.stopOne, dict.product.stopOther)}`;

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
                      {departureCity && arrivalCity ? (
                        <>
                          <bdi>{departureCity}</bdi> {routeArrow} <bdi>{arrivalCity}</bdi>
                        </>
                      ) : (
                        name
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75">
                      {duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {duration}
                        </span>
                      )}
                      <span>{stopsLabel}</span>
                      {flight.basePrice != null && (
                        <span className="font-semibold text-white">
                          {dict.product.from} {flight.currency} {flight.basePrice.toLocaleString()}{" "}
                          {dict.product.perPerson}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors group-hover:decoration-white">
                      {dict.product.viewDetails}
                      <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
                    </p>
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
