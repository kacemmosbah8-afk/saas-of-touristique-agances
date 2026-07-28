import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock, Check, X, Info, ShieldCheck } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { getPackageBySlug } from "@/features/packages/queries/get-package-by-slug.query";
import { getItinerary } from "@/features/itinerary/queries/get-itinerary.query";
import { Reveal } from "@/features/public-site/components/reveal";
import { Parallax } from "@/features/public-site/components/parallax";
import { ImagePlaceholder } from "@/shared/components/media/image-placeholder";
import { StickyBookBar } from "@/features/public-site/components/sticky-book-bar";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { getDictionary } from "@/shared/i18n/dictionary";
import { packageDifficultyLabels } from "@/shared/i18n/enum-labels";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { localize, localizeNullable, localizeList } from "@/shared/lib/i18n/localize";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string; packageSlug: string }>;
}) {
  const { tenantSlug, packageSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  const [pkg, locale] = await Promise.all([
    getPackageBySlug(getTenantDb(tenant.id), packageSlug),
    getVisitorLocale(),
  ]);
  // A dead/stale link must still show the agency's own name in the browser
  // tab, never fall through to the root layout's TravelOS-branded default.
  if (!pkg) return { title: tenant.name };
  return {
    title: localize(locale, pkg.seoTitle || pkg.name, pkg.seoTitleFr || pkg.nameFr),
    description:
      localizeNullable(locale, pkg.seoDescription || pkg.shortDescription, pkg.seoDescriptionFr || pkg.shortDescriptionFr) ??
      undefined,
  };
}

export default async function PublicPackageDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; packageSlug: string }>;
}) {
  const { tenantSlug, packageSlug } = await params;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const [pkg, locale] = await Promise.all([
    getPackageBySlug(getTenantDb(tenant.id), packageSlug),
    getVisitorLocale(),
  ]);
  if (!pkg) notFound();

  const itineraryDays = await getItinerary(getTenantDb(tenant.id), pkg.id);

  const dict = getDictionary(locale);
  const name = localize(locale, pkg.name, pkg.nameFr);
  const location = [
    localize(locale, pkg.destination ?? "", pkg.destinationFr) || null,
    localize(locale, pkg.country ?? "", pkg.countryFr) || null,
  ]
    .filter(Boolean)
    .join(", ");
  const duration =
    pkg.duration && pkg.durationNights
      ? `${pkg.duration} ${pkg.duration === 1 ? dict.hero.dayOne : dict.hero.dayOther} / ${pkg.durationNights} ${pkg.durationNights === 1 ? dict.hero.nightOne : dict.hero.nightOther}`
      : pkg.duration
        ? `${pkg.duration} ${pkg.duration === 1 ? dict.hero.dayOne : dict.hero.dayOther}`
        : null;
  const gallery = pkg.images;
  const bookHref = `/${tenantSlug}/book?package=${encodeURIComponent(pkg.slug)}`;
  const shortDescription = localizeNullable(locale, pkg.shortDescription, pkg.shortDescriptionFr);
  const description = localizeNullable(locale, pkg.description, pkg.descriptionFr);
  const highlights = localizeList(locale, pkg.highlights, pkg.highlightsFr);
  const includedServices = localizeList(locale, pkg.includedServices, pkg.includedServicesFr);
  const excludedServices = localizeList(locale, pkg.excludedServices, pkg.excludedServicesFr);
  const whatToBring = localizeList(locale, pkg.whatToBring, pkg.whatToBringFr);
  const importantNotes = localizeList(locale, pkg.importantNotes, pkg.importantNotesFr);
  const meetingPoint = localizeNullable(locale, pkg.meetingPoint, pkg.meetingPointFr);
  const cancellationPolicy = localizeNullable(locale, pkg.cancellationPolicy, pkg.cancellationPolicyFr);
  const hasIncludedOrExcluded = includedServices.length > 0 || excludedServices.length > 0;

  return (
    <div>
      {/* Full-bleed hero — the header floats transparent over this */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <div className="bg-muted absolute inset-0 overflow-hidden">
          <Parallax strength={0.15} className="absolute -inset-y-16 inset-x-0">
            {pkg.coverImageUrl ? (
              <Image
                src={pkg.coverImageUrl}
                alt={name}
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
            href={`/${tenantSlug}/packages`}
            className="mb-5 inline-block text-sm text-white/70 hover:text-white"
          >
            {dict.product.backToPackages}
          </Link>
          <h1 className="text-[clamp(2.4rem,6vw,4.2rem)] leading-[1] font-semibold tracking-tight text-balance">
            {name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-white/80">
            {location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {location}
              </span>
            )}
            {duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {duration}
              </span>
            )}
            {pkg.difficulty && (
              <Badge variant="secondary" className="bg-white/15 text-white">
                {packageDifficultyLabels[locale][pkg.difficulty]}
              </Badge>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            {shortDescription && (
              <Reveal>
                <p className="text-lg leading-relaxed font-medium text-balance">
                  {shortDescription}
                </p>
              </Reveal>
            )}
            {description && (
              <Reveal delay={60}>
                <p className="text-muted-foreground mt-4 leading-relaxed whitespace-pre-line">
                  {description}
                </p>
              </Reveal>
            )}
          </div>
          <Reveal className="flex flex-col items-start gap-3 sm:items-end">
            {pkg.sellingPrice != null && (
              <p className="text-muted-foreground text-sm">
                {dict.product.from}{" "}
                <span className="text-foreground text-xl font-semibold">
                  {pkg.currency} {pkg.sellingPrice.toLocaleString()}
                </span>{" "}
                {dict.product.perPerson}
              </p>
            )}
            <Button asChild size="lg" className="text-base">
              <Link href={bookHref}>{dict.product.requestToBook}</Link>
            </Button>
            <p className="text-muted-foreground text-xs sm:text-end">
              {dict.product.noPaymentShort}
            </p>
          </Reveal>
        </div>
        <span id="pkg-hero-cta-sentinel" />

        {gallery.length > 0 && (
          <Reveal className="mt-14">
            <div className="grid auto-rows-[160px] grid-cols-3 gap-3 sm:auto-rows-[220px] sm:gap-4">
              {gallery.map((img, i) => (
                <div
                  key={img.id}
                  className={`bg-muted relative overflow-hidden rounded-xl ${
                    i % 5 === 0 ? "col-span-2 row-span-2" : "col-span-1"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={localizeNullable(locale, img.alt, img.altFr) || name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 300px"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {highlights.length > 0 && (
          <Reveal as="section" className="mt-16">
            <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              {dict.product.tripHighlightsKicker}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">{dict.product.whatMakesSpecial}</h2>
            <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {highlights.map((h, i) => (
                <div key={i} className="border-border/70 flex gap-4 border-t pt-4">
                  <span className="font-serif text-primary/40 text-2xl leading-none font-semibold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="pt-0.5 text-[15px] leading-relaxed text-balance">{h}</p>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {itineraryDays.length > 0 && (
          <Reveal as="section" className="mt-16">
            <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              {dict.product.itineraryKicker}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">{dict.product.itineraryTitle}</h2>
            <div className="border-border/70 mt-8 space-y-8 border-t">
              {itineraryDays.map((day) => {
                const dayTitle = localize(locale, day.title, day.titleFr);
                const dayDescription = localizeNullable(locale, day.description, day.descriptionFr);
                const meals = [
                  localizeNullable(locale, day.mealBreakfast, day.mealBreakfastFr) && {
                    label: dict.product.mealBreakfastLabel,
                    value: localizeNullable(locale, day.mealBreakfast, day.mealBreakfastFr),
                  },
                  localizeNullable(locale, day.mealLunch, day.mealLunchFr) && {
                    label: dict.product.mealLunchLabel,
                    value: localizeNullable(locale, day.mealLunch, day.mealLunchFr),
                  },
                  localizeNullable(locale, day.mealDinner, day.mealDinnerFr) && {
                    label: dict.product.mealDinnerLabel,
                    value: localizeNullable(locale, day.mealDinner, day.mealDinnerFr),
                  },
                ].filter((m): m is { label: string; value: string } => Boolean(m));
                return (
                  <div key={day.id} className="flex gap-5 pt-8 first:pt-0">
                    <span className="font-serif text-primary/40 shrink-0 text-2xl leading-none font-semibold">
                      {String(day.dayNumber).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase">
                        {dict.product.dayLabel} {day.dayNumber}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-balance">{dayTitle}</h3>
                      {dayDescription && (
                        <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">
                          {dayDescription}
                        </p>
                      )}
                      {day.activities.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {day.activities.map((activity) => (
                            <li key={activity.id} className="flex items-start gap-2 text-[15px]">
                              <Check className="text-primary mt-0.5 size-4 shrink-0" />
                              {localize(locale, activity.title, activity.titleFr)}
                            </li>
                          ))}
                        </ul>
                      )}
                      {meals.length > 0 && (
                        <p className="text-muted-foreground mt-3 text-sm">
                          {meals.map((m) => `${m.label}: ${m.value}`).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        )}

        {hasIncludedOrExcluded && (
          <Reveal as="section" className="mt-16">
            <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              {dict.product.goodToKnow}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">{dict.product.whatsIncludedTitle}</h2>
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              {includedServices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">{dict.product.included}</h3>
                  <ul className="mt-3 space-y-2">
                    {includedServices.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[15px]">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {excludedServices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">{dict.product.notIncluded}</h3>
                  <ul className="mt-3 space-y-2">
                    {excludedServices.map((s, i) => (
                      <li key={i} className="text-muted-foreground flex items-start gap-2 text-[15px]">
                        <X className="mt-0.5 size-4 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {(whatToBring.length > 0 || importantNotes.length > 0) && (
          <Reveal as="section" className="mt-16 grid gap-10 sm:grid-cols-2">
            {whatToBring.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{dict.product.whatToBringTitle}</h2>
                <ul className="mt-4 space-y-2">
                  {whatToBring.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[15px]">
                      <Check className="text-primary mt-0.5 size-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {importantNotes.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{dict.product.importantNotesTitle}</h2>
                <ul className="mt-4 space-y-2">
                  {importantNotes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[15px]">
                      <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Reveal>
        )}

        {(meetingPoint || cancellationPolicy) && (
          <Reveal as="section" className="border-border/70 mt-16 grid gap-10 border-t pt-12 sm:grid-cols-2">
            {meetingPoint && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <MapPin className="text-primary size-4" />
                  {dict.product.meetingPointTitle}
                </h2>
                <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
                  {meetingPoint}
                </p>
              </div>
            )}
            {cancellationPolicy && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <ShieldCheck className="text-primary size-4" />
                  {dict.product.cancellationPolicyTitle}
                </h2>
                <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed whitespace-pre-line">
                  {cancellationPolicy}
                </p>
              </div>
            )}
          </Reveal>
        )}

        <Reveal as="section" className="mt-16 rounded-2xl border p-10 text-center sm:p-14">
          <p className="font-serif text-2xl font-semibold text-balance">
            {dict.product.readyToBook} {name}?
          </p>
          <p className="text-muted-foreground mt-2">{dict.product.noPaymentLong}</p>
          <Button asChild className="mt-6 text-base" size="lg">
            <Link href={bookHref}>{dict.product.requestToBook}</Link>
          </Button>
          <p className="text-muted-foreground mt-4 text-sm">
            {dict.product.justHaveQuestion}{" "}
            <Link
              href={`/${tenantSlug}/contact?package=${encodeURIComponent(pkg.slug)}`}
              className="text-foreground underline underline-offset-2"
            >
              {dict.nav.contact}
            </Link>{" "}
            {dict.product.contactUsInstead}
          </p>
        </Reveal>
      </div>
      <StickyBookBar
        sentinelId="pkg-hero-cta-sentinel"
        name={name}
        price={
          pkg.sellingPrice != null
            ? `${dict.product.from} ${pkg.currency} ${pkg.sellingPrice.toLocaleString()}`
            : undefined
        }
        bookHref={bookHref}
        ctaLabel={dict.product.requestToBook}
      />
    </div>
  );
}
