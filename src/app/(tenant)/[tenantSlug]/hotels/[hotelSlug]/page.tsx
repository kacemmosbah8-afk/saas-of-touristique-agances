import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Check } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { getHotelBySlug } from "@/features/hotels/queries/get-hotel-by-slug.query";
import { HOTEL_CATEGORY_LABELS, ROOM_TYPE_KIND_LABELS } from "@/features/hotels/lib/labels";
import { Reveal } from "@/features/public-site/components/reveal";
import { Parallax } from "@/features/public-site/components/parallax";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string; hotelSlug: string }>;
}) {
  const { tenantSlug, hotelSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  const hotel = await getHotelBySlug(getTenantDb(tenant.id), hotelSlug);
  if (!hotel) return {};
  return { title: hotel.name, description: hotel.description || undefined };
}

export default async function PublicHotelDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; hotelSlug: string }>;
}) {
  const { tenantSlug, hotelSlug } = await params;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const hotel = await getHotelBySlug(getTenantDb(tenant.id), hotelSlug);
  if (!hotel) notFound();

  const location = [hotel.city, hotel.country].filter(Boolean).join(", ");
  const bookHref = `/${tenantSlug}/book?hotel=${encodeURIComponent(hotel.slug)}`;

  return (
    <div>
      {/* Full-bleed hero — the header floats transparent over this */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <div className="bg-muted absolute inset-0 overflow-hidden">
          <Parallax strength={0.15} className="absolute -inset-y-16 inset-x-0">
            {hotel.coverImageUrl && (
              <Image
                src={hotel.coverImageUrl}
                alt={hotel.name}
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
            href={`/${tenantSlug}/hotels`}
            className="mb-5 inline-block text-sm text-white/70 hover:text-white"
          >
            ← Hotels
          </Link>
          <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">
            {HOTEL_CATEGORY_LABELS[hotel.category]}
          </p>
          <h1 className="text-[clamp(2.4rem,6vw,4.2rem)] leading-[1] font-semibold tracking-tight text-balance">
            {hotel.name}
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
            {hotel.address && <p className="text-muted-foreground text-sm">{hotel.address}</p>}
            {hotel.description && (
              <p className="mt-4 text-lg leading-relaxed whitespace-pre-line">{hotel.description}</p>
            )}
          </Reveal>
          <Reveal>
            <Button asChild size="lg" className="text-base">
              <Link href={bookHref}>Request to Book</Link>
            </Button>
          </Reveal>
        </div>

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
                    alt={img.alt || hotel.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 300px"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {hotel.amenities.length > 0 && (
          <Reveal as="section" className="mt-14">
            <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              Comforts &amp; extras
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">Amenities</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {hotel.amenities.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px]">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {hotel.roomTypes.length > 0 && (
          <section className="mt-14">
            <Reveal>
              <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
                Where you&apos;ll stay
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">Room Options</h2>
            </Reveal>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {hotel.roomTypes.map((room, i) => (
                <Reveal key={room.id} delay={i * 60} className="rounded-2xl border p-5">
                  <p className="font-serif text-lg font-semibold">{room.name}</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {ROOM_TYPE_KIND_LABELS[room.kind]} · Sleeps {room.capacity}
                    {room.beds ? ` · ${room.beds} bed${room.beds === 1 ? "" : "s"}` : ""}
                  </p>
                  {room.basePrice != null && (
                    <p className="text-primary mt-3 font-semibold">
                      {room.currency} {room.basePrice.toLocaleString()}
                      <span className="text-muted-foreground font-normal"> / night</span>
                    </p>
                  )}
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <Reveal as="section" className="mt-16 rounded-2xl border p-10 text-center sm:p-14">
          <p className="font-serif text-2xl font-semibold text-balance">
            Want to stay at {hotel.name}?
          </p>
          <p className="text-muted-foreground mt-2">
            Send a booking request and we&apos;ll confirm availability and pricing with you directly.
          </p>
          <Button asChild className="mt-6 text-base" size="lg">
            <Link href={bookHref}>Request to Book</Link>
          </Button>
          <p className="text-muted-foreground mt-4 text-sm">
            Just have a question?{" "}
            <Link
              href={`/${tenantSlug}/contact?hotel=${encodeURIComponent(hotel.slug)}`}
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
