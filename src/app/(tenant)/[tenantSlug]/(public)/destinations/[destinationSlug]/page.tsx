import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { getDestinationBySlug } from "@/features/destinations/queries/get-destination-by-slug.query";
import { listPackages } from "@/features/packages/queries/list-packages.query";
import { Reveal } from "@/features/public-site/components/reveal";
import { Parallax } from "@/features/public-site/components/parallax";
import { PackageCard } from "@/features/public-site/components/package-card";
import { ImagePlaceholder } from "@/shared/components/media/image-placeholder";
import { Button } from "@/shared/components/ui/button";
import { getDictionary } from "@/shared/i18n/dictionary";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { localize, localizeNullable, localizeList } from "@/shared/lib/i18n/localize";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string; destinationSlug: string }>;
}) {
  const { tenantSlug, destinationSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  const [destination, locale] = await Promise.all([
    getDestinationBySlug(getTenantDb(tenant.id), destinationSlug),
    getVisitorLocale(),
  ]);
  // A dead/stale link must still show the agency's own name in the browser
  // tab, never fall through to the root layout's TravelOS-branded default.
  if (!destination) return { title: tenant.name };
  return {
    title: localize(locale, destination.seoTitle || destination.name, destination.seoTitleFr || destination.nameFr),
    description:
      localizeNullable(
        locale,
        destination.seoDescription || destination.description,
        destination.seoDescriptionFr || destination.descriptionFr,
      ) ?? undefined,
  };
}

export default async function PublicDestinationDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; destinationSlug: string }>;
}) {
  const { tenantSlug, destinationSlug } = await params;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const db = getTenantDb(tenant.id);
  const [destination, locale] = await Promise.all([
    getDestinationBySlug(db, destinationSlug),
    getVisitorLocale(),
  ]);
  if (!destination) notFound();

  const dict = getDictionary(locale);
  const name = localize(locale, destination.name, destination.nameFr);
  const location = [
    localize(locale, destination.region ?? "", destination.regionFr) || null,
    localize(locale, destination.country, destination.countryFr) || null,
  ]
    .filter(Boolean)
    .join(", ");
  const description = localizeNullable(locale, destination.description, destination.descriptionFr);
  const popularAttractions = localizeList(locale, destination.popularAttractions, destination.popularAttractionsFr);
  const bookHref = `/${tenantSlug}/book?destination=${encodeURIComponent(destination.slug)}`;

  // Real, priced products a visitor can actually request, matched by a loose
  // text search against the destination's own name — the closest thing to a
  // relation this schema has (`Package.destination` is free text, not a
  // foreign key). Falling back to the generic "Request to Book" below covers
  // the case where nothing matches yet.
  const relatedPackages = await listPackages(db, {
    status: "PUBLISHED",
    search: destination.name,
  });

  return (
    <div>
      {/* Full-bleed hero — the header floats transparent over this */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <div className="bg-muted absolute inset-0 overflow-hidden">
          <Parallax strength={0.15} className="absolute -inset-y-16 inset-x-0">
            {destination.heroImageUrl ? (
              <Image
                src={destination.heroImageUrl}
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
            href={`/${tenantSlug}/destinations`}
            className="mb-5 inline-block text-sm text-white/70 hover:text-white"
          >
            {dict.product.backToDestinations}
          </Link>
          <h1 className="text-[clamp(2.4rem,6vw,4.2rem)] leading-[1] font-semibold tracking-tight text-balance">
            {name}
          </h1>
          {location && (
            <p className="mt-4 flex items-center gap-1.5 text-white/80">
              <MapPin className="size-4" />
              {location}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          {description && (
            <Reveal className="max-w-2xl">
              <p className="text-lg leading-relaxed whitespace-pre-line">{description}</p>
            </Reveal>
          )}
          <Reveal>
            <Button asChild size="lg" className="text-base">
              <Link href={bookHref}>{dict.product.requestToBook}</Link>
            </Button>
          </Reveal>
        </div>

        {relatedPackages.packages.length > 0 && (
          <Reveal as="section" className="mt-14">
            <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              {dict.product.readyMadeKicker}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {dict.product.tripsTo} {name}
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {relatedPackages.packages.slice(0, 4).map((pkg) => (
                <PackageCard key={pkg.id} tenantSlug={tenantSlug} pkg={pkg} locale={locale} />
              ))}
            </div>
          </Reveal>
        )}

        {destination.gallery.length > 0 && (
          <Reveal className="mt-14">
            <div className="grid auto-rows-[160px] grid-cols-3 gap-3 sm:auto-rows-[220px] sm:gap-4">
              {destination.gallery.map((img, i) => (
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

        {popularAttractions.length > 0 && (
          <Reveal as="section" className="mt-14">
            <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              {dict.product.notToMissKicker}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">{dict.product.popularAttractionsTitle}</h2>
            <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {popularAttractions.map((a, i) => (
                <div key={i} className="border-border/70 flex gap-4 border-t pt-4">
                  <span className="font-serif text-primary/40 text-2xl leading-none font-semibold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="pt-0.5 text-[15px] leading-relaxed text-balance">{a}</p>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        <Reveal
          as="section"
          className="mt-16 rounded-2xl border p-10 text-center sm:p-14"
        >
          <p className="font-serif text-2xl font-semibold text-balance">
            {dict.product.wantToVisit} {name}?
          </p>
          <p className="text-muted-foreground mt-2">{dict.product.noPaymentLong}</p>
          <Button asChild className="mt-6 text-base" size="lg">
            <Link href={bookHref}>{dict.product.requestToBook}</Link>
          </Button>
          <p className="text-muted-foreground mt-4 text-sm">
            {dict.product.justHaveQuestion}{" "}
            <Link
              href={`/${tenantSlug}/contact?destination=${encodeURIComponent(destination.slug)}`}
              className="text-foreground underline underline-offset-2"
            >
              {dict.nav.contact}
            </Link>{" "}
            {dict.product.contactUsInstead}
          </p>
        </Reveal>
      </div>
    </div>
  );
}
