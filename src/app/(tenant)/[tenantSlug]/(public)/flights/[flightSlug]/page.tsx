import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PlaneTakeoff, Clock } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { getFlightBySlug } from "@/features/flights/queries/get-flight-by-slug.query";
import { Reveal } from "@/features/public-site/components/reveal";
import { Parallax } from "@/features/public-site/components/parallax";
import { ImagePlaceholder } from "@/shared/components/media/image-placeholder";
import { StickyBookBar } from "@/features/public-site/components/sticky-book-bar";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { getDictionary, plural, type Dictionary } from "@/shared/i18n/dictionary";
import { cabinClassLabels, type CabinClass } from "@/shared/i18n/enum-labels";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { localize, localizeNullable } from "@/shared/lib/i18n/localize";

function formatDuration(minutes: number | null, dict: Dictionary) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0
    ? `${h}${dict.product.hourAbbr} ${m}${dict.product.minuteAbbr}`
    : `${h}${dict.product.hourAbbr}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string; flightSlug: string }>;
}) {
  const { tenantSlug, flightSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  const [flight, locale] = await Promise.all([
    getFlightBySlug(getTenantDb(tenant.id), flightSlug),
    getVisitorLocale(),
  ]);
  // A dead/stale link must still show the agency's own name in the browser
  // tab, never fall through to the root layout's TravelOS-branded default.
  if (!flight) return { title: tenant.name };
  return {
    title: localize(locale, flight.seoTitle || flight.name, flight.seoTitleFr || flight.nameFr),
    description:
      localizeNullable(
        locale,
        flight.seoDescription || flight.shortDescription,
        flight.seoDescriptionFr || flight.shortDescriptionFr,
      ) ?? undefined,
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

  const [flight, locale] = await Promise.all([
    getFlightBySlug(getTenantDb(tenant.id), flightSlug),
    getVisitorLocale(),
  ]);
  if (!flight) notFound();

  const dict = getDictionary(locale);
  const name = localize(locale, flight.name, flight.nameFr);
  const departureCity = localize(locale, flight.departureCity ?? "", flight.departureCityFr);
  const arrivalCity = localize(locale, flight.arrivalCity ?? "", flight.arrivalCityFr);
  const route = departureCity && arrivalCity ? `${departureCity} → ${arrivalCity}` : name;
  const departureAirport = localizeNullable(locale, flight.departureAirport, flight.departureAirportFr);
  const arrivalAirport = localizeNullable(locale, flight.arrivalAirport, flight.arrivalAirportFr);
  const shortDescription = localizeNullable(locale, flight.shortDescription, flight.shortDescriptionFr);
  const description = localizeNullable(locale, flight.description, flight.descriptionFr);
  // Cabin class is picked from a fixed Select in the admin (ECONOMY,
  // BUSINESS...), not typed free text, so it's a label lookup keyed by that
  // constant — not a `localize()` content field.
  const cabinClassLabel = flight.cabinClass
    ? (cabinClassLabels[locale][flight.cabinClass as CabinClass] ?? flight.cabinClass)
    : null;
  const duration = formatDuration(flight.durationMinutes, dict);
  const stopsLabel =
    flight.stops === 0
      ? dict.product.direct
      : `${flight.stops} ${plural(flight.stops, dict.product.stopOne, dict.product.stopOther)}`;
  const bookHref = `/${tenantSlug}/book?flight=${encodeURIComponent(flight.slug)}`;

  return (
    <div>
      {/* Full-bleed hero — the header floats transparent over this */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <div className="bg-muted absolute inset-0 overflow-hidden">
          <Parallax strength={0.15} className="absolute -inset-y-16 inset-x-0">
            {flight.coverImageUrl ? (
              <Image
                src={flight.coverImageUrl}
                alt={route}
                fill
                priority
                className="object-cover"
                sizes="100vw"
              />
            ) : (
              <ImagePlaceholder />
            )}
          </Parallax>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
        </div>

        <div className="relative mx-auto w-full max-w-5xl px-4 pt-[var(--site-header-h,8rem)] pb-14 text-white sm:px-6 sm:pb-20">
          <Link
            href={`/${tenantSlug}/flights`}
            className="mb-5 inline-block text-sm text-white/70 hover:text-white"
          >
            {dict.product.backToFlights}
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
          {shortDescription && (
            <p className="mt-4 max-w-xl text-lg text-white/85">{shortDescription}</p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          {description ? (
            <Reveal className="max-w-2xl">
              <p className="text-lg leading-relaxed whitespace-pre-line">{description}</p>
            </Reveal>
          ) : (
            <span />
          )}
          <Reveal className="flex flex-col items-end gap-3">
            {flight.basePrice != null && (
              <p className="text-muted-foreground text-sm">
                {dict.product.from}{" "}
                <span className="text-foreground text-xl font-semibold">
                  {flight.currency} {flight.basePrice.toLocaleString()}
                </span>{" "}
                {dict.product.perPerson}
              </p>
            )}
            <Button asChild size="lg" className="text-base">
              <Link href={bookHref}>{dict.product.requestToBook}</Link>
            </Button>
            <p className="text-muted-foreground text-xs text-end">
              {dict.product.noPaymentShort}
            </p>
          </Reveal>
        </div>
        <span id="flight-hero-cta-sentinel" />

        {/* Route details — departure / arrival */}
        <Reveal className="mt-14">
          <div className="grid gap-6 rounded-2xl border p-6 sm:grid-cols-2 sm:p-8">
            <div className="flex items-start gap-4">
              <PlaneTakeoff className="text-primary mt-1 size-5 shrink-0" />
              <div>
                <p className="text-brand-sage text-xs font-semibold tracking-[0.14em] uppercase">
                  {dict.product.departure}
                </p>
                <p className="mt-1 font-serif text-xl font-semibold">{departureCity || "—"}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {[departureAirport, flight.departureTime].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <PlaneTakeoff className="text-primary mt-1 size-5 shrink-0 rotate-90" />
              <div>
                <p className="text-brand-sage text-xs font-semibold tracking-[0.14em] uppercase">
                  {dict.product.arrival}
                </p>
                <p className="mt-1 font-serif text-xl font-semibold">{arrivalCity || "—"}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {[arrivalAirport, flight.arrivalTime].filter(Boolean).join(" · ") || "—"}
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
          {cabinClassLabel && <Badge variant="secondary">{cabinClassLabel}</Badge>}
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
                    alt={localizeNullable(locale, img.alt, img.altFr) || route}
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
          <p className="font-serif text-2xl font-semibold text-balance">{dict.product.interestedInFlight}</p>
          <p className="text-muted-foreground mt-2">{dict.product.noPaymentLong}</p>
          <Button asChild className="mt-6 text-base" size="lg">
            <Link href={bookHref}>{dict.product.requestToBook}</Link>
          </Button>
          <p className="text-muted-foreground mt-4 text-sm">
            {dict.product.justHaveQuestion}{" "}
            <Link
              href={`/${tenantSlug}/contact?flight=${encodeURIComponent(flight.slug)}`}
              className="text-foreground underline underline-offset-2"
            >
              {dict.nav.contact}
            </Link>{" "}
            {dict.product.contactUsInstead}
          </p>
        </Reveal>
      </div>
      <StickyBookBar
        sentinelId="flight-hero-cta-sentinel"
        name={route}
        price={
          flight.basePrice != null
            ? `${dict.product.from} ${flight.currency} ${flight.basePrice.toLocaleString()}`
            : undefined
        }
        bookHref={bookHref}
        ctaLabel={dict.product.requestToBook}
      />
    </div>
  );
}
