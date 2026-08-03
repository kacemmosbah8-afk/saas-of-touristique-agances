import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";

import { getCachedTenant } from "@/shared/lib/db";
import { listPublicDestinations } from "@/features/public-site/lib/public-cache";
import { Reveal } from "@/features/public-site/components/reveal";
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
  return { title: `${dict.listing.destinations.title} — ${tenant.name}` };
}

export default async function PublicDestinationsPage({
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

  const result = await listPublicDestinations(tenant.id, {
    status: "ACTIVE",
    search: q || undefined,
    page: page ? Number(page) || 1 : 1,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
        <div>
          <p className="text-brand-sage mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
            {result.total} {plural(result.total, dict.listing.destinations.kickerOne, dict.listing.destinations.kickerOther)}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{dict.listing.destinations.title}</h1>
          <p className="text-muted-foreground mt-3 max-w-xl">{dict.listing.destinations.description}</p>
        </div>
        <form className="border-border/70 flex w-full max-w-xs items-center gap-2 border-b pb-2 sm:w-auto" method="get">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={dict.listing.destinations.searchPlaceholder}
            className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
          />
        </form>
      </div>

      {result.destinations.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-16 text-center">
          {q ? dict.listing.destinations.emptySearch : dict.listing.destinations.emptyDefault}
        </p>
      ) : (
        <div className="grid auto-rows-[220px] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {result.destinations.map((destination, i) => {
            const tall = i % 5 === 0;
            const name = localize(locale, destination.name, destination.nameFr);
            const region = localize(locale, destination.region ?? "", destination.regionFr);
            const country = localize(locale, destination.country, destination.countryFr);
            return (
              <Reveal
                key={destination.id}
                delay={(i % 8) * 60}
                className={cn(
                  "col-span-2 sm:col-span-1",
                  tall && "row-span-2 sm:col-span-2",
                )}
              >
                <Link
                  href={`/${tenantSlug}/destinations/${destination.slug}`}
                  className="group relative block h-full w-full overflow-hidden rounded-2xl"
                >
                  <div className="bg-muted absolute inset-0">
                    {destination.heroImageUrl ? (
                      <Image
                        src={destination.heroImageUrl}
                        alt={name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes={tall ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 100vw, 25vw"}
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
                    {(region || country) && (
                      <p className="mt-0.5 text-sm text-white/75">
                        {[region, country].filter(Boolean).join(", ")}
                      </p>
                    )}
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
