import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Check } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { getDestinationBySlug } from "@/features/destinations/queries/get-destination-by-slug.query";
import { Reveal } from "@/features/public-site/components/reveal";
import { Parallax } from "@/features/public-site/components/parallax";
import { Button } from "@/shared/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string; destinationSlug: string }>;
}) {
  const { tenantSlug, destinationSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  const destination = await getDestinationBySlug(getTenantDb(tenant.id), destinationSlug);
  if (!destination) return {};
  return {
    title: destination.seoTitle || destination.name,
    description: destination.seoDescription || destination.description || undefined,
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

  const destination = await getDestinationBySlug(getTenantDb(tenant.id), destinationSlug);
  if (!destination) notFound();

  const location = [destination.region, destination.country].filter(Boolean).join(", ");
  const bookHref = `/${tenantSlug}/book?destination=${encodeURIComponent(destination.slug)}`;

  return (
    <div>
      {/* Full-bleed hero — the header floats transparent over this */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <div className="bg-muted absolute inset-0 overflow-hidden">
          <Parallax strength={0.15} className="absolute -inset-y-16 inset-x-0">
            {destination.heroImageUrl && (
              <Image
                src={destination.heroImageUrl}
                alt={destination.name}
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
            href={`/${tenantSlug}/destinations`}
            className="mb-5 inline-block text-sm text-white/70 hover:text-white"
          >
            ← Destinations
          </Link>
          <h1 className="text-[clamp(2.4rem,6vw,4.2rem)] leading-[1] font-semibold tracking-tight text-balance">
            {destination.name}
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
          {destination.description && (
            <Reveal className="max-w-2xl">
              <p className="text-lg leading-relaxed whitespace-pre-line">{destination.description}</p>
            </Reveal>
          )}
          <Reveal>
            <Button asChild size="lg" className="text-base">
              <Link href={bookHref}>Request to Book</Link>
            </Button>
          </Reveal>
        </div>

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
                    alt={img.alt || destination.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 300px"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {destination.popularAttractions.length > 0 && (
          <Reveal as="section" className="mt-14">
            <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              Not to miss
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">Popular Attractions</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {destination.popularAttractions.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px]">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        <Reveal
          as="section"
          className="mt-16 rounded-2xl border p-10 text-center sm:p-14"
        >
          <p className="font-serif text-2xl font-semibold text-balance">
            Want to visit {destination.name}?
          </p>
          <p className="text-muted-foreground mt-2">
            Send a booking request and we&apos;ll help you plan the trip.
          </p>
          <Button asChild className="mt-6 text-base" size="lg">
            <Link href={bookHref}>Request to Book</Link>
          </Button>
          <p className="text-muted-foreground mt-4 text-sm">
            Just have a question?{" "}
            <Link
              href={`/${tenantSlug}/contact?destination=${encodeURIComponent(destination.slug)}`}
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
