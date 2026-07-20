import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { PlaneTakeoff, Building2, Ticket, Mail, Phone, MessageCircle } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { getAgencyProfile } from "@/features/settings/queries/settings.query";
import { listPackages } from "@/features/packages/queries/list-packages.query";
import { listFlights } from "@/features/flights/queries/list-flights.query";
import { listHotels } from "@/features/hotels/queries/list-hotels.query";
import { listDestinations } from "@/features/destinations/queries/list-destinations.query";
import { listActivities } from "@/features/activities/queries/list-activities.query";
import { PackageCard } from "@/features/public-site/components/package-card";
import { CompactItemRow } from "@/features/public-site/components/compact-item-row";
import { Reveal } from "@/features/public-site/components/reveal";
import { StoryBreak } from "@/features/public-site/components/story-break";
import { HeroCarousel, type HeroSlide } from "@/features/public-site/components/hero-carousel";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};

  const profile = await getAgencyProfile(tenant.id);
  return {
    title: tenant.name,
    description: profile.tagline || profile.description || undefined,
  };
}

const QUICK_LINKS = [
  { label: "Packages", segment: "packages" },
  { label: "Flights", segment: "flights" },
  { label: "Hotels", segment: "hotels" },
  { label: "Destinations", segment: "destinations" },
  { label: "Activities", segment: "activities" },
] as const;

export default async function PublicHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const db = getTenantDb(tenant.id);
  const [profile, packagesResult, flightsResult, hotelsResult, destinationsResult, activitiesResult] =
    await Promise.all([
      getAgencyProfile(tenant.id),
      listPackages(db, { status: "PUBLISHED" }),
      listFlights(db, { status: "PUBLISHED" }),
      listHotels(db, { status: "ACTIVE" }),
      listDestinations(db, { status: "ACTIVE" }),
      listActivities(db, { status: "ACTIVE" }),
    ]);

  const pickFeatured = <T extends { featured: boolean }>(items: T[], limit: number): T[] =>
    (items.some((i) => i.featured) ? items.filter((i) => i.featured) : items).slice(0, limit);

  const heroPackages = pickFeatured(packagesResult.packages, 3);
  const railDestinations = pickFeatured(destinationsResult.destinations, 8);
  const previewFlights = pickFeatured(flightsResult.flights, 3);
  const previewHotels = pickFeatured(hotelsResult.hotels, 3);
  const previewActivities = pickFeatured(activitiesResult.activities, 3);

  const heroImageUrl =
    heroPackages[0]?.coverImageUrl ?? railDestinations[0]?.heroImageUrl ?? null;

  // A handful of the agency's best photos for the rotating hero — featured
  // packages first (they're the primary sell), then destinations, deduped,
  // capped at 5 so the carousel stays tight.
  const heroSlides: HeroSlide[] = Array.from(
    new Map(
      [
        ...heroPackages.map((p) => (p.coverImageUrl ? { imageUrl: p.coverImageUrl, alt: p.name } : null)),
        ...railDestinations.map((d) =>
          d.heroImageUrl ? { imageUrl: d.heroImageUrl, alt: d.name } : null,
        ),
      ]
        .filter((s): s is HeroSlide => s != null)
        .map((s) => [s.imageUrl, s]),
    ).values(),
  ).slice(0, 5);

  const storyDestination = railDestinations.find((d) => d.description) ?? null;

  const hasContactInfo = profile.contactEmail || profile.contactPhone || profile.whatsapp;
  const hasExploreMore =
    previewFlights.length > 0 || previewHotels.length > 0 || previewActivities.length > 0;

  return (
    <div>
      {/* Hero — full-bleed rotating carousel, the header floats transparent over this */}
      <HeroCarousel slides={heroSlides}>
        <div className={cn(heroSlides.length > 0 && "text-white")}>
          <p
            className={cn(
              "mb-4 text-xs font-semibold tracking-[0.2em] uppercase",
              heroSlides.length > 0 ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {tenant.name}
          </p>
          <h1 className="max-w-3xl text-[clamp(2.6rem,7vw,5rem)] leading-[0.98] font-semibold tracking-tight text-balance">
            {profile.tagline || "Somewhere worth flying for."}
          </h1>
          {profile.description && (
            <p
              className={cn(
                "mt-6 max-w-xl text-lg leading-relaxed",
                heroSlides.length > 0 ? "text-white/85" : "text-muted-foreground",
              )}
            >
              {profile.description}
            </p>
          )}
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="text-base">
              <Link href={`/${tenantSlug}/packages`}>Browse Packages</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant={heroSlides.length > 0 ? "secondary" : "outline"}
              className="text-base"
            >
              <Link href={`/${tenantSlug}/contact`}>Plan With Us</Link>
            </Button>
          </div>
        </div>
      </HeroCarousel>

      {/* Quick links — quiet editorial strip, not icon tiles */}
      <nav className="border-border/70 border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6">
          <span className="text-muted-foreground font-serif text-sm italic">Explore</span>
          {QUICK_LINKS.map(({ label, segment }) => (
            <Link
              key={segment}
              href={`/${tenantSlug}/${segment}`}
              className="hover:text-primary text-sm font-medium tracking-wide transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Featured packages — asymmetric spotlight */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal>
          <SectionHeader
            kicker="Curated by us, not an algorithm"
            title={packagesResult.packages.some((p) => p.featured) ? "Featured Packages" : "Our Packages"}
            href={`/${tenantSlug}/packages`}
            show={packagesResult.total > 0}
          />
        </Reveal>

        {heroPackages.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
            No packages published yet. Check back soon.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {heroPackages.map((pkg, i) => (
              <Reveal
                key={pkg.id}
                delay={i * 80}
                className={i === 0 ? "sm:col-span-2 lg:col-span-2 lg:row-span-2" : ""}
              >
                <PackageCard tenantSlug={tenantSlug} pkg={pkg} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Destinations — anchor + rail, varied sizes instead of a uniform grid */}
      {railDestinations.length > 0 && (
        <section className="bg-muted/30 border-y py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <SectionHeader
                kicker="Where next"
                title="Popular Destinations"
                href={`/${tenantSlug}/destinations`}
                show
              />
            </Reveal>
          </div>
          <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-2 sm:px-6">
            <div className="flex snap-x items-end gap-4">
              {railDestinations.map((destination, i) => (
                <Link
                  key={destination.id}
                  href={`/${tenantSlug}/destinations/${destination.slug}`}
                  className={cn(
                    "group shrink-0 snap-start",
                    i === 0 ? "w-64 sm:w-80" : "w-44 sm:w-52",
                  )}
                >
                  <div
                    className={cn(
                      "bg-muted relative w-full overflow-hidden rounded-2xl",
                      i === 0 ? "aspect-[3/4]" : "aspect-[3/4]",
                    )}
                  >
                    {destination.heroImageUrl && (
                      <Image
                        src={destination.heroImageUrl}
                        alt={destination.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes={i === 0 ? "320px" : "208px"}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p
                        className={cn(
                          "font-serif font-semibold text-white",
                          i === 0 ? "text-xl" : "text-base",
                        )}
                      >
                        {destination.name}
                      </p>
                      {destination.country && (
                        <p className="text-xs text-white/75">{destination.country}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Editorial story break */}
      {storyDestination && (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <StoryBreak
            kicker="A closer look"
            title={storyDestination.name}
            imageUrl={storyDestination.heroImageUrl}
            imageAlt={storyDestination.name}
            href={`/${tenantSlug}/destinations/${storyDestination.slug}`}
            cta="See trips there"
          >
            <p className="line-clamp-5">{storyDestination.description}</p>
          </StoryBreak>
        </section>
      )}

      {/* Flights / Hotels / Activities — combined, compact */}
      {hasExploreMore && (
        <section className="border-border/70 border-t px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything for your trip
              </h2>
              <p className="text-muted-foreground mt-2 text-lg">
                Flights, stays and things to do — all in one place.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {previewFlights.length > 0 && (
                <Reveal delay={0}>
                  <ExploreColumn title="Flights" icon={PlaneTakeoff} href={`/${tenantSlug}/flights`}>
                    {previewFlights.map((flight) => (
                      <CompactItemRow
                        key={flight.id}
                        href={`/${tenantSlug}/flights/${flight.slug}`}
                        name={flight.name}
                        imageUrl={flight.coverImageUrl}
                        meta={
                          flight.departureCity && flight.arrivalCity
                            ? `${flight.departureCity} → ${flight.arrivalCity}`
                            : null
                        }
                        price={
                          flight.basePrice != null
                            ? `${flight.currency} ${flight.basePrice.toLocaleString()}`
                            : null
                        }
                      />
                    ))}
                  </ExploreColumn>
                </Reveal>
              )}

              {previewHotels.length > 0 && (
                <Reveal delay={90}>
                  <ExploreColumn title="Hotels" icon={Building2} href={`/${tenantSlug}/hotels`}>
                    {previewHotels.map((hotel) => (
                      <CompactItemRow
                        key={hotel.id}
                        href={`/${tenantSlug}/hotels/${hotel.slug}`}
                        name={hotel.name}
                        imageUrl={hotel.coverImageUrl}
                        meta={[hotel.city, hotel.country].filter(Boolean).join(", ") || null}
                      />
                    ))}
                  </ExploreColumn>
                </Reveal>
              )}

              {previewActivities.length > 0 && (
                <Reveal delay={180}>
                  <ExploreColumn title="Activities" icon={Ticket} href={`/${tenantSlug}/activities`}>
                    {previewActivities.map((activity) => (
                      <CompactItemRow
                        key={activity.id}
                        href={`/${tenantSlug}/activities/${activity.slug}`}
                        name={activity.name}
                        imageUrl={activity.coverImageUrl}
                        meta={[activity.city, activity.country].filter(Boolean).join(", ") || null}
                        price={
                          activity.sellingPrice != null
                            ? `${activity.currency} ${activity.sellingPrice.toLocaleString()}`
                            : null
                        }
                      />
                    ))}
                  </ExploreColumn>
                </Reveal>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Closing CTA — bookends the hero with the same full-bleed treatment */}
      <section className="relative overflow-hidden">
        <div className="bg-muted absolute inset-0">
          {heroImageUrl && (
            <Image
              src={heroImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <Reveal className="relative mx-auto max-w-3xl px-4 py-24 text-center text-white sm:px-6 sm:py-32">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ready to plan your next trip?
          </h2>
          <p className="mt-3 text-lg text-white/80">
            Tell us what you have in mind and we&apos;ll take it from there.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="text-base">
              <Link href={`/${tenantSlug}/contact`}>Contact Us</Link>
            </Button>
          </div>
          {hasContactInfo && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/75">
              {profile.contactEmail && (
                <a
                  href={`mailto:${profile.contactEmail}`}
                  className="flex items-center gap-1.5 hover:text-white hover:underline"
                >
                  <Mail className="size-4" />
                  {profile.contactEmail}
                </a>
              )}
              {profile.contactPhone && (
                <a
                  href={`tel:${profile.contactPhone}`}
                  className="flex items-center gap-1.5 hover:text-white hover:underline"
                >
                  <Phone className="size-4" />
                  {profile.contactPhone}
                </a>
              )}
              {profile.whatsapp && (
                <a
                  href={`https://wa.me/${profile.whatsapp.replace(/[^\d+]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-white hover:underline"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              )}
            </div>
          )}
        </Reveal>
      </section>
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  href,
  show,
}: {
  kicker: string;
  title: string;
  href: string;
  show: boolean;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-brand-sage mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
          {kicker}
        </p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      </div>
      {show && (
        <Link href={href} className="text-primary text-sm font-semibold hover:underline">
          View all →
        </Link>
      )}
    </div>
  );
}

function ExploreColumn({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  icon: typeof PlaneTakeoff;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className="text-primary size-4" />
          {title}
        </h3>
        <Link href={href} className="text-muted-foreground text-xs hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
