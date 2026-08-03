import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, MapPin, ArrowUpRight } from "lucide-react";

import { getCachedTenant } from "@/shared/lib/db";
import { listPublicPackages } from "@/features/public-site/lib/public-cache";
import { Reveal } from "@/features/public-site/components/reveal";
import { StoryBreak } from "@/features/public-site/components/story-break";
import { ImagePlaceholder } from "@/shared/components/media/image-placeholder";
import { cn } from "@/shared/lib/utils";
import { getDictionary, plural } from "@/shared/i18n/dictionary";
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
  return { title: `${dict.listing.packages.title} — ${tenant.name}` };
}

export default async function PublicPackagesPage({
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

  const result = await listPublicPackages(tenant.id, {
    status: "PUBLISHED",
    search: q || undefined,
    page: page ? Number(page) || 1 : 1,
  });

  // Prefer a featured package with a teaser description for the story
  // treatment; fall back to the first result so the section still renders.
  const featured =
    result.packages.find((p) => p.featured && p.shortDescription) ??
    result.packages.find((p) => p.featured) ??
    result.packages[0] ??
    null;
  const rest = featured ? result.packages.filter((p) => p.id !== featured.id) : result.packages;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
        <div>
          <p className="text-brand-sage mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
            {result.total} {plural(result.total, dict.listing.packages.kickerOne, dict.listing.packages.kickerOther)}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{dict.listing.packages.title}</h1>
          <p className="text-muted-foreground mt-3 max-w-xl">{dict.listing.packages.description}</p>
        </div>
        <form className="border-border/70 flex w-full max-w-xs items-center gap-2 border-b pb-2 sm:w-auto" method="get">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={dict.listing.packages.searchPlaceholder}
            className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
          />
        </form>
      </div>

      {result.packages.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-16 text-center">
          {q ? dict.listing.packages.emptySearch : dict.listing.packages.emptyDefault}
        </p>
      ) : (
        <>
          {featured && (
            <Reveal as="section" className="mb-16 sm:mb-24">
              <StoryBreak
                kicker={dict.listing.packages.featuredTrip}
                title={localize(locale, featured.name, featured.nameFr)}
                imageUrl={featured.coverImageUrl}
                imageAlt={localize(locale, featured.name, featured.nameFr)}
                href={`/${tenantSlug}/packages/${featured.slug}`}
                cta={dict.listing.packages.viewPackage}
                locale={locale}
              >
                {(() => {
                  const location = [
                    localize(locale, featured.destination ?? "", featured.destinationFr) || null,
                    localize(locale, featured.country ?? "", featured.countryFr) || null,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    location && (
                      <p className="text-brand-sage mb-3 flex items-center gap-1.5 text-sm font-medium">
                        <MapPin className="size-4" />
                        {location}
                      </p>
                    )
                  );
                })()}
                <p className="line-clamp-5">
                  {localize(locale, featured.shortDescription ?? "", featured.shortDescriptionFr)}
                </p>
                {featured.sellingPrice != null && (
                  <p className="text-muted-foreground mt-4 text-sm">
                    {dict.product.from}{" "}
                    <span className="text-foreground font-semibold">
                      {featured.currency} {featured.sellingPrice.toLocaleString()}
                    </span>{" "}
                    {dict.product.perPerson}
                  </p>
                )}
              </StoryBreak>
            </Reveal>
          )}

          {rest.length > 0 && (
            <div className="grid auto-rows-[220px] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {rest.map((pkg, i) => {
                const tall = i % 5 === 0;
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
                return (
                  <Reveal
                    key={pkg.id}
                    delay={(i % 8) * 60}
                    className={cn("col-span-2 sm:col-span-1", tall && "row-span-2 sm:col-span-2")}
                  >
                    <Link
                      href={`/${tenantSlug}/packages/${pkg.slug}`}
                      className="group relative block h-full w-full overflow-hidden rounded-2xl"
                    >
                      <div className="bg-muted absolute inset-0">
                        {pkg.coverImageUrl ? (
                          <Image
                            src={pkg.coverImageUrl}
                            alt={name}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                            sizes={
                              tall ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 100vw, 25vw"
                            }
                          />
                        ) : (
                          <ImagePlaceholder />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent transition-opacity group-hover:from-black/85" />
                      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                        <p
                          className={cn(
                            "font-serif font-semibold text-white",
                            tall ? "text-2xl sm:text-3xl" : "text-lg",
                          )}
                        >
                          {name}
                        </p>
                        {location && <p className="mt-0.5 text-sm text-white/75">{location}</p>}
                        <div className="mt-0.5 flex items-baseline justify-between gap-2">
                          {duration && <p className="text-sm text-white/60">{duration}</p>}
                          {pkg.sellingPrice != null && (
                            <p className="text-sm text-white/75">
                              {dict.product.from} {pkg.currency} {pkg.sellingPrice.toLocaleString()} {dict.product.perPerson}
                            </p>
                          )}
                        </div>
                        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors group-hover:decoration-white">
                          {dict.hero.viewTrip}
                          <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
                        </p>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
