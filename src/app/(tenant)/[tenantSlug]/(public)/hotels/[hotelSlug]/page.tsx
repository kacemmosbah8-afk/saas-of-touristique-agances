import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, Star } from "lucide-react";

import { getCachedTenant } from "@/shared/lib/db";
import { getPublicHotelBySlug } from "@/features/public-site/lib/public-cache";
import { Reveal } from "@/features/public-site/components/reveal";
import { Parallax } from "@/features/public-site/components/parallax";
import { ImagePlaceholder } from "@/shared/components/media/image-placeholder";
import { StickyBookBar } from "@/features/public-site/components/sticky-book-bar";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { getDictionary, plural } from "@/shared/i18n/dictionary";
import { hotelCategoryLabels, roomTypeKindLabels } from "@/shared/i18n/enum-labels";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";
import { localize, localizeNullable, localizeList } from "@/shared/lib/i18n/localize";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string; hotelSlug: string }>;
}) {
  const { tenantSlug, hotelSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  const [hotel, locale] = await Promise.all([
    getPublicHotelBySlug(tenant.id, hotelSlug),
    getVisitorLocale(),
  ]);
  // A dead/stale link must still show the agency's own name in the browser
  // tab, never fall through to the root layout's TravelOS-branded default.
  if (!hotel) return { title: tenant.name };
  return {
    title: localize(locale, hotel.name, hotel.nameFr),
    description: localizeNullable(locale, hotel.description, hotel.descriptionFr) ?? undefined,
  };
}

export default async function PublicHotelDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; hotelSlug: string }>;
}) {
  const { tenantSlug, hotelSlug } = await params;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const [hotel, locale] = await Promise.all([
    getPublicHotelBySlug(tenant.id, hotelSlug),
    getVisitorLocale(),
  ]);
  if (!hotel) notFound();

  const dict = getDictionary(locale);
  const name = localize(locale, hotel.name, hotel.nameFr);
  const location = [
    localize(locale, hotel.city ?? "", hotel.cityFr) || null,
    localize(locale, hotel.country ?? "", hotel.countryFr) || null,
  ]
    .filter(Boolean)
    .join(", ");
  const address = localizeNullable(locale, hotel.address, hotel.addressFr);
  const description = localizeNullable(locale, hotel.description, hotel.descriptionFr);
  const amenities = localizeList(locale, hotel.amenities, hotel.amenitiesFr);
  const bookHref = `/${tenantSlug}/book?hotel=${encodeURIComponent(hotel.slug)}`;
  const fromPrice = hotel.roomTypes
    .filter((r) => r.basePrice != null)
    .sort((a, b) => (a.basePrice as number) - (b.basePrice as number))[0] ?? null;

  return (
    <div>
      {/* Full-bleed hero — the header floats transparent over this */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <div className="bg-muted absolute inset-0 overflow-hidden">
          <Parallax strength={0.15} className="absolute -inset-y-16 inset-x-0">
            {hotel.coverImageUrl ? (
              <Image
                src={hotel.coverImageUrl}
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
            href={`/${tenantSlug}/hotels`}
            className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/40"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {dict.product.backToHotels}
          </Link>
          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">
            {hotelCategoryLabels[locale][hotel.category]}
          </p>
          <h1 className="text-[clamp(2.4rem,6vw,4.2rem)] leading-[1] font-semibold tracking-tight text-balance">
            {name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-white/80">
            {location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {location}
              </span>
            )}
            {hotel.stars && (
              <span className="flex items-center gap-1">
                {hotel.stars}
                <Star className="size-4 fill-current" />
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <Reveal className="max-w-2xl">
            {address && <p className="text-muted-foreground text-sm">{address}</p>}
            {description && (
              <p className="mt-4 text-lg leading-relaxed whitespace-pre-line">{description}</p>
            )}
          </Reveal>
          <Reveal className="flex flex-col items-start gap-3 sm:items-end">
            {fromPrice && (
              <p className="text-muted-foreground text-sm">
                {dict.product.from}{" "}
                <span className="text-foreground text-xl font-semibold">
                  {fromPrice.currency} {fromPrice.basePrice?.toLocaleString()}
                </span>{" "}
                {dict.product.perNight}
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
        <span id="hotel-hero-cta-sentinel" />

        {hotel.images.length > 0 && (
          <Reveal className="mt-14">
            <div className="grid auto-rows-[160px] grid-cols-3 gap-3 sm:auto-rows-[220px] sm:gap-4">
              {hotel.images.map((img, i) => (
                <div
                  key={img.id}
                  className={cn(
                    "bg-muted relative overflow-hidden rounded-xl",
                    i % 5 === 0 ? "col-span-2 row-span-2" : "col-span-1",
                  )}
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

        {amenities.length > 0 && (
          <Reveal as="section" className="mt-14">
            <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              {dict.product.comfortsExtrasKicker}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">{dict.product.amenitiesTitle}</h2>
            <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {amenities.map((a, i) => (
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

        {hotel.roomTypes.length > 0 && (
          <section className="mt-14">
            <Reveal>
              <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
                {dict.product.whereYoullStayKicker}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">{dict.product.roomOptionsTitle}</h2>
            </Reveal>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {hotel.roomTypes.map((room, i) => {
                const roomName = localize(locale, room.name, room.nameFr);
                return (
                  <Reveal key={room.id} delay={i * 60} className="rounded-2xl border p-5">
                    <p className="font-serif text-lg font-semibold">{roomName}</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {roomTypeKindLabels[locale][room.kind]} · {dict.product.sleeps} {room.capacity}
                      {room.beds
                        ? ` · ${room.beds} ${plural(room.beds, dict.product.bedOne, dict.product.bedOther)}`
                        : ""}
                    </p>
                    {room.basePrice != null && (
                      <p className="text-primary mt-3 font-semibold">
                        {room.currency} {room.basePrice.toLocaleString()}
                        <span className="text-muted-foreground font-normal"> {dict.product.perNight}</span>
                      </p>
                    )}
                  </Reveal>
                );
              })}
            </div>
          </section>
        )}

        <Reveal as="section" className="mt-16 rounded-2xl border p-10 text-center sm:p-14">
          <p className="font-serif text-2xl font-semibold text-balance">
            {dict.product.wantToStay} {name}?
          </p>
          <p className="text-muted-foreground mt-2">{dict.product.noPaymentLong}</p>
          <Button asChild className="mt-6 text-base" size="lg">
            <Link href={bookHref}>{dict.product.requestToBook}</Link>
          </Button>
          <p className="text-muted-foreground mt-4 text-sm">
            {dict.product.justHaveQuestion}{" "}
            <Link
              href={`/${tenantSlug}/contact?hotel=${encodeURIComponent(hotel.slug)}`}
              className="text-foreground underline underline-offset-2"
            >
              {dict.nav.contact}
            </Link>{" "}
            {dict.product.contactUsInstead}
          </p>
        </Reveal>
      </div>
      <StickyBookBar
        sentinelId="hotel-hero-cta-sentinel"
        name={name}
        price={
          fromPrice
            ? `${dict.product.from} ${fromPrice.currency} ${fromPrice.basePrice?.toLocaleString()}`
            : undefined
        }
        bookHref={bookHref}
        ctaLabel={dict.product.requestToBook}
      />
    </div>
  );
}
