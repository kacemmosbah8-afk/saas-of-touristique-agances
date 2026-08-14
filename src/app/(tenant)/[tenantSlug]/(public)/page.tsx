import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  PlaneTakeoff,
  Building2,
  Ticket,
  Mail,
  Phone,
  MessageCircle,
  Compass,
  UserCheck,
  MessagesSquare,
  Send,
  CheckCircle2,
  Stamp,
} from "lucide-react";

import { getCachedTenant } from "@/shared/lib/db";
import {
  getCachedAgencyProfile,
  listPublicPackages,
  listPublicFlights,
  listPublicHotels,
  listPublicDestinations,
  listPublicActivities,
} from "@/features/public-site/lib/public-cache";
import { PackageCard } from "@/features/public-site/components/package-card";
import { CompactItemRow } from "@/features/public-site/components/compact-item-row";
import { Reveal } from "@/features/public-site/components/reveal";
import { StoryBreak } from "@/features/public-site/components/story-break";
import { HeroCarousel, type HeroSlide } from "@/features/public-site/components/hero-carousel";
import { TestimonialSpotlight } from "@/features/public-site/components/testimonial-spotlight";
import { DestinationRailCard } from "@/features/public-site/components/destination-rail-card";
import { StaggerGroup, StaggerItem } from "@/features/public-site/components/motion/stagger-group";
import { MagneticButton } from "@/features/public-site/components/motion/magnetic-button";
import { CountUp } from "@/features/public-site/components/motion/count-up";
import { ImagePlaceholder } from "@/shared/components/media/image-placeholder";
import { IconChip } from "@/shared/components/brand/icon-chip";
import { Button } from "@/shared/components/ui/button";
import { getDictionary, localeDir, interpolate, type Locale } from "@/shared/i18n/dictionary";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { localize, localizeList } from "@/shared/lib/i18n/localize";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};

  const [profile, locale] = await Promise.all([
    getCachedAgencyProfile(tenant.id),
    getVisitorLocale(),
  ]);
  const tagline = localize(locale, profile.tagline ?? "", profile.taglineFr);
  const description = localize(locale, profile.description ?? "", profile.descriptionFr);
  return {
    title: tenant.name,
    description: tagline || description || undefined,
  };
}

// Icon assignments only — titles/copy come from the dictionary so the
// homepage renders in whichever locale the storefront layout resolves.
const DIFFERENTIATOR_ICONS = [Compass, UserCheck, MessagesSquare] as const;
const HOW_IT_WORKS_ICONS = [Compass, Send, CheckCircle2] as const;
const QUICK_LINK_SEGMENTS = [
  "packages",
  "flights",
  "hotels",
  "destinations",
  "activities",
  "visa-assistance",
] as const;

export default async function PublicHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const [profile, locale, packagesResult, flightsResult, hotelsResult, destinationsResult, activitiesResult] =
    await Promise.all([
      getCachedAgencyProfile(tenant.id),
      getVisitorLocale(),
      listPublicPackages(tenant.id, { status: "PUBLISHED" }),
      listPublicFlights(tenant.id, { status: "PUBLISHED" }),
      listPublicHotels(tenant.id, { status: "ACTIVE" }),
      listPublicDestinations(tenant.id, { status: "ACTIVE" }),
      listPublicActivities(tenant.id, { status: "ACTIVE" }),
    ]);

  const dict = getDictionary(locale);
  // The flight route arrow must visually point from departure to arrival,
  // which is the opposite physical direction in RTL vs LTR.
  const routeArrow = localeDir[locale] === "rtl" ? "←" : "→";

  const pickFeatured = <T extends { featured: boolean }>(items: T[], limit: number): T[] =>
    (items.some((i) => i.featured) ? items.filter((i) => i.featured) : items).slice(0, limit);

  // The hero cycles through every published package, not just featured
  // ones — with a small catalog this keeps the auto-advancing carousel
  // varied instead of looping the same 3 slides.
  const heroPackages = packagesResult.packages;
  const railDestinations = pickFeatured(destinationsResult.destinations, 8);
  const previewFlights = pickFeatured(flightsResult.flights, 3);
  const previewHotels = pickFeatured(hotelsResult.hotels, 3);
  const previewActivities = pickFeatured(activitiesResult.activities, 3);

  const heroImageUrl =
    heroPackages[0]?.coverImageUrl ?? railDestinations[0]?.heroImageUrl ?? null;

  function formatDuration(days: number | null, nights: number | null): string | null {
    if (days == null) return null;
    const dayWord = days === 1 ? dict.hero.dayOne : dict.hero.dayOther;
    if (nights == null) return `${days} ${dayWord}`;
    const nightWord = nights === 1 ? dict.hero.nightOne : dict.hero.nightOther;
    return `${days} ${dayWord} / ${nights} ${nightWord}`;
  }

  // Every slide is a real, published package with a cover image — no
  // hardcoded copy, no destination-photo filler. Editing a package's price,
  // title, or cover image in the admin changes what shows here on the next
  // request; nothing about the Hero itself needs to change.
  const heroSlides: HeroSlide[] = heroPackages
    .filter((p): p is typeof p & { coverImageUrl: string } => p.coverImageUrl != null)
    .map((p) => {
      const name = localize(locale, p.name, p.nameFr);
      const location = [
        localize(locale, p.destination ?? "", p.destinationFr) || null,
        localize(locale, p.country ?? "", p.countryFr) || null,
      ]
        .filter(Boolean)
        .join(", ");
      return {
        imageUrl: p.coverImageUrl,
        alt: name,
        title: name,
        location: location || null,
        duration: formatDuration(p.duration, p.durationNights),
        priceLabel:
          p.sellingPrice != null
            ? `${dict.hero.fromPrice} ${p.currency} ${p.sellingPrice.toLocaleString()} ${dict.hero.perPerson}`
            : null,
        description: localize(locale, p.shortDescription ?? "", p.shortDescriptionFr) || null,
        href: `/${tenantSlug}/packages/${p.slug}`,
      };
    });

  const storyDestination = railDestinations.find((d) => d.description) ?? null;

  // Same figures as before, restructured as {value, label} pairs instead of
  // one joined string — the homepage now counts these up with `CountUp`
  // rather than printing a static line.
  const statEntries = [
    packagesResult.total > 0
      ? { value: packagesResult.total, label: packagesResult.total === 1 ? dict.stats.tripOne : dict.stats.tripOther }
      : null,
    destinationsResult.total > 0
      ? {
          value: destinationsResult.total,
          label: destinationsResult.total === 1 ? dict.stats.destinationOne : dict.stats.destinationOther,
        }
      : null,
    hotelsResult.total > 0
      ? { value: hotelsResult.total, label: hotelsResult.total === 1 ? dict.stats.stayOne : dict.stats.stayOther }
      : null,
  ].filter((entry): entry is { value: number; label: string } => entry !== null);

  const hasContactInfo = profile.contactEmail || profile.contactPhone || profile.whatsapp;
  const hasExploreMore =
    previewFlights.length > 0 || previewHotels.length > 0 || previewActivities.length > 0;

  const differentiators = dict.differentiators.map((d, i) => ({ ...d, icon: DIFFERENTIATOR_ICONS[i] }));
  const howItWorksSteps = dict.howItWorks.steps.map((s, i) => ({ ...s, icon: HOW_IT_WORKS_ICONS[i] }));
  const quickLinks = [
    dict.nav.packages,
    dict.nav.flights,
    dict.nav.hotels,
    dict.nav.destinations,
    dict.nav.activities,
    dict.nav.visaAssistance,
  ].map((label, i) => ({ label, segment: QUICK_LINK_SEGMENTS[i] }));

  const tagline = localize(locale, profile.tagline ?? "", profile.taglineFr);
  const description = localize(locale, profile.description ?? "", profile.descriptionFr);

  return (
    <div>
      {/* Hero — full-bleed rotating carousel, one real published package per
          slide (title, location, duration, price, its own "view this trip"
          link). `fallback` only renders when no package has a cover image
          yet — the agency's tagline/description stand in until then. */}
      <HeroCarousel
        slides={heroSlides}
        agencyName={tenant.name}
        viewTripLabel={dict.hero.viewTrip}
        browsePackagesLabel={dict.hero.browsePackages}
        browsePackagesHref={`/${tenantSlug}/packages`}
        locale={locale}
        fallback={
          <div className="text-muted-foreground">
            <p className="mb-4 text-xs font-semibold tracking-[0.2em] uppercase">{tenant.name}</p>
            <h1 className="text-foreground max-w-3xl text-[clamp(2.6rem,7vw,5rem)] leading-[0.98] font-semibold tracking-tight text-balance">
              {tagline || dict.hero.fallbackTagline}
            </h1>
            {description && (
              <p className="mt-6 max-w-xl text-lg leading-relaxed">{description}</p>
            )}
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="text-base">
                <Link href={`/${tenantSlug}/packages`}>{dict.hero.browsePackages}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link href={`/${tenantSlug}/plan-trip`}>{dict.hero.planWithUs}</Link>
              </Button>
            </div>
          </div>
        }
      />

      {/* Quick links — quiet editorial strip, not icon tiles */}
      <nav className="border-border/70 border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6">
          <span className="text-muted-foreground font-serif text-sm italic">{dict.nav.explore}</span>
          {quickLinks.map(({ label, segment }) => (
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

      {/* Trust section — differentiators + how-it-works used to be two
          back-to-back sections repeating the same "3-column icon card"
          pattern, which read as one long uniform scroll. Combined into one
          section with internal variation instead: an icon-led row (why us)
          followed by a numbered-step row (how it works) on a shared dark
          background, with the stat row as a single confident line between
          them rather than a quiet footnote. Orchestrated stagger entrance
          (`StaggerGroup`) replaces the old per-item `Reveal` so the whole
          row arrives as one choreographed beat instead of items popping in
          independently. */}
      <section className="bg-section-dark text-section-dark-foreground px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <StaggerGroup className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {differentiators.map(({ icon: Icon, title, copy }) => (
              <StaggerItem key={title}>
                <Icon className="text-brand-sage size-7" />
                <h3 className="font-serif mt-4 text-xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{copy}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>

          {statEntries.length > 0 && (
            <Reveal delay={200}>
              <div className="mt-14 flex flex-wrap items-baseline gap-x-10 gap-y-4 border-t border-white/15 pt-10">
                {statEntries.map(({ value, label }) => (
                  <p key={label} className="flex items-baseline gap-2">
                    <CountUp value={value} className="font-serif text-4xl font-semibold sm:text-5xl" />
                    <span className="text-sm text-white/60">{label}</span>
                  </p>
                ))}
              </div>
            </Reveal>
          )}

          <div className="mt-20 sm:mt-24">
            <Reveal>
              <p className="text-brand-sage mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
                {dict.howItWorks.kicker}
              </p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{dict.howItWorks.title}</h2>
            </Reveal>
            <StaggerGroup className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {howItWorksSteps.map(({ icon: Icon, title, copy }, i) => (
                <StaggerItem key={title} className="relative">
                  <div className="border-brand-sage/40 text-brand-sage flex size-10 items-center justify-center rounded-full border-2 font-serif text-sm font-semibold">
                    {i + 1}
                  </div>
                  <Icon className="text-brand-sage mt-4 size-5" />
                  <h3 className="font-serif mt-3 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{copy}</p>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </div>
      </section>

      {/* Visa assistance — a complementary service, not an inventory item, so
          it gets its own promotional card rather than joining the
          Flights/Hotels/Activities `ExploreColumn` grid below (which lists
          real catalog items, not a single CTA). Placed right after the
          trust-building "how it works" section since visa help is part of
          the same "we handle this for you" story. */}
      <section className="border-border/70 border-t px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="bg-muted/30 border-border/70 flex flex-col items-start gap-6 rounded-2xl border p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
              <div className="flex items-start gap-4">
                <IconChip icon={Stamp} variant="gold" size={48} />
                <div>
                  <p className="text-brand-sage mb-1 text-xs font-semibold tracking-[0.14em] uppercase">
                    {dict.visaPromo.kicker}
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {dict.visaPromo.title}
                  </h2>
                  <p className="text-muted-foreground mt-2 max-w-xl text-base leading-relaxed">
                    {dict.visaPromo.body}
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="w-full shrink-0 text-base sm:w-auto">
                <Link href={`/${tenantSlug}/visa-assistance`}>{dict.visaPromo.cta}</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Featured packages — asymmetric spotlight */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal>
          <SectionHeader
            kicker={dict.packages.kicker}
            title={packagesResult.packages.some((p) => p.featured) ? dict.packages.featuredTitle : dict.packages.ourPackagesTitle}
            viewAllLabel={dict.packages.viewAll}
            href={`/${tenantSlug}/packages`}
            show={packagesResult.total > 0}
            locale={locale}
          />
        </Reveal>

        {heroPackages.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
            {dict.packages.empty}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {heroPackages.map((pkg, i) => (
              <Reveal
                key={pkg.id}
                delay={i * 80}
                className={i === 0 ? "sm:col-span-2 lg:col-span-2 lg:row-span-2" : ""}
              >
                <PackageCard tenantSlug={tenantSlug} pkg={pkg} locale={locale} large={i === 0} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Testimonials — every quote is entered by the agency in settings;
          the section simply doesn't render until at least one real one
          exists, same convention as every other public-site field. */}
      {profile.testimonials.length > 0 && (
        <section className="border-border/70 border-t py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <p className="text-brand-sage mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
                {dict.testimonials.kicker}
              </p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {dict.testimonials.title}
              </h2>
            </Reveal>
            <Reveal delay={120} className="mt-14">
              <TestimonialSpotlight
                quotes={localizeList(locale, profile.testimonials, profile.testimonialsFr).slice(0, 6)}
                dotLabel={(n) => interpolate(dict.hero.goToSlide, { n: String(n) })}
              />
            </Reveal>
          </div>
        </section>
      )}

      {/* Destinations — anchor + rail, varied sizes instead of a uniform grid */}
      {railDestinations.length > 0 && (
        <section className="bg-muted/30 border-y py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <SectionHeader
                kicker={dict.destinations.kicker}
                title={dict.destinations.title}
                viewAllLabel={dict.packages.viewAll}
                href={`/${tenantSlug}/destinations`}
                show
                locale={locale}
              />
            </Reveal>
          </div>
          <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-2 sm:px-6">
            <div className="flex snap-x items-end gap-4">
              {railDestinations.map((destination, i) => (
                <DestinationRailCard
                  key={destination.id}
                  href={`/${tenantSlug}/destinations/${destination.slug}`}
                  name={localize(locale, destination.name, destination.nameFr)}
                  country={localize(locale, destination.country ?? "", destination.countryFr)}
                  imageUrl={destination.heroImageUrl}
                  large={i === 0}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Editorial story break */}
      {storyDestination && (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <StoryBreak
            kicker={dict.storyBreak.kicker}
            title={localize(locale, storyDestination.name, storyDestination.nameFr)}
            imageUrl={storyDestination.heroImageUrl}
            imageAlt={localize(locale, storyDestination.name, storyDestination.nameFr)}
            href={`/${tenantSlug}/destinations/${storyDestination.slug}`}
            cta={dict.storyBreak.cta}
            locale={locale}
          >
            <p className="line-clamp-5">
              {localize(locale, storyDestination.description ?? "", storyDestination.descriptionFr)}
            </p>
          </StoryBreak>
        </section>
      )}

      {/* Flights / Hotels / Activities — combined, compact */}
      {hasExploreMore && (
        <section className="border-border/70 border-t px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {dict.exploreMore.title}
              </h2>
              <p className="text-muted-foreground mt-2 text-lg">
                {dict.exploreMore.subtitle}
              </p>
            </Reveal>

            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {previewFlights.length > 0 && (
                <Reveal delay={0}>
                  <ExploreColumn
                    title={dict.exploreMore.flights}
                    viewAllLabel={dict.exploreMore.viewAll}
                    icon={PlaneTakeoff}
                    variant="primary"
                    href={`/${tenantSlug}/flights`}
                  >
                    {previewFlights.map((flight) => {
                      const departureCity = localize(locale, flight.departureCity ?? "", flight.departureCityFr);
                      const arrivalCity = localize(locale, flight.arrivalCity ?? "", flight.arrivalCityFr);
                      return (
                        <CompactItemRow
                          key={flight.id}
                          href={`/${tenantSlug}/flights/${flight.slug}`}
                          name={localize(locale, flight.name, flight.nameFr)}
                          imageUrl={flight.coverImageUrl}
                          meta={
                            departureCity && arrivalCity ? (
                              <>
                                <bdi>{departureCity}</bdi> {routeArrow} <bdi>{arrivalCity}</bdi>
                              </>
                            ) : null
                          }
                          price={
                            flight.basePrice != null
                              ? `${flight.currency} ${flight.basePrice.toLocaleString()}`
                              : null
                          }
                        />
                      );
                    })}
                  </ExploreColumn>
                </Reveal>
              )}

              {previewHotels.length > 0 && (
                <Reveal delay={90}>
                  <ExploreColumn
                    title={dict.exploreMore.hotels}
                    viewAllLabel={dict.exploreMore.viewAll}
                    icon={Building2}
                    variant="gold"
                    href={`/${tenantSlug}/hotels`}
                  >
                    {previewHotels.map((hotel) => {
                      const city = localize(locale, hotel.city ?? "", hotel.cityFr);
                      const country = localize(locale, hotel.country ?? "", hotel.countryFr);
                      return (
                        <CompactItemRow
                          key={hotel.id}
                          href={`/${tenantSlug}/hotels/${hotel.slug}`}
                          name={localize(locale, hotel.name, hotel.nameFr)}
                          imageUrl={hotel.coverImageUrl}
                          meta={[city, country].filter(Boolean).join(", ") || null}
                          price={
                            hotel.fromPrice
                              ? `${hotel.fromPrice.currency} ${hotel.fromPrice.amount.toLocaleString()}`
                              : null
                          }
                        />
                      );
                    })}
                  </ExploreColumn>
                </Reveal>
              )}

              {previewActivities.length > 0 && (
                <Reveal delay={180}>
                  <ExploreColumn
                    title={dict.exploreMore.activities}
                    viewAllLabel={dict.exploreMore.viewAll}
                    icon={Ticket}
                    variant="primary"
                    href={`/${tenantSlug}/activities`}
                  >
                    {previewActivities.map((activity) => {
                      const city = localize(locale, activity.city ?? "", activity.cityFr);
                      const country = localize(locale, activity.country ?? "", activity.countryFr);
                      return (
                        <CompactItemRow
                          key={activity.id}
                          href={`/${tenantSlug}/activities/${activity.slug}`}
                          name={localize(locale, activity.name, activity.nameFr)}
                          imageUrl={activity.coverImageUrl}
                          meta={[city, country].filter(Boolean).join(", ") || null}
                          price={
                            activity.sellingPrice != null
                              ? `${activity.currency} ${activity.sellingPrice.toLocaleString()}`
                              : null
                          }
                        />
                      );
                    })}
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
          {heroImageUrl ? (
            <Image
              src={heroImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <ImagePlaceholder />
          )}
          {/* Deeper than the previous flat black/70 — matches the hero's
              strengthened overlay so the two full-bleed "bookend" moments
              feel like the same dramatic register. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/70 to-black/50" />
        </div>
        <StaggerGroup className="relative mx-auto max-w-3xl px-4 py-24 text-center text-white sm:px-6 sm:py-32">
          <StaggerItem>
            <h2 className="text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05] font-semibold tracking-tight text-balance">
              {dict.closingCta.title}
            </h2>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-3 text-lg text-white/80">{dict.closingCta.subtitle}</p>
          </StaggerItem>
          <StaggerItem className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <MagneticButton>
              <Button asChild size="lg" variant="secondary" className="text-base">
                <Link href={`/${tenantSlug}/contact`}>{dict.closingCta.contactUs}</Link>
              </Button>
            </MagneticButton>
          </StaggerItem>
          {hasContactInfo && (
            <StaggerItem className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/75">
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
            </StaggerItem>
          )}
        </StaggerGroup>
      </section>
    </div>
  );
}

function SectionHeader({
  kicker,
  title,
  href,
  show,
  viewAllLabel,
  locale,
}: {
  kicker: string;
  title: string;
  href: string;
  show: boolean;
  viewAllLabel: string;
  locale: Locale;
}) {
  // The arrow is a directional glyph, not decoration — it has to point
  // toward reading-progression, which is the opposite physical direction
  // in RTL vs LTR.
  const arrow = localeDir[locale] === "rtl" ? "←" : "→";
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
          {viewAllLabel} {arrow}
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
  viewAllLabel,
  variant = "primary",
}: {
  title: string;
  icon: typeof PlaneTakeoff;
  href: string;
  children: React.ReactNode;
  viewAllLabel: string;
  variant?: "primary" | "gold";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <IconChip icon={Icon} variant={variant} size={26} />
          {title}
        </h3>
        <Link href={href} className="text-muted-foreground text-xs hover:underline">
          {viewAllLabel}
        </Link>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
