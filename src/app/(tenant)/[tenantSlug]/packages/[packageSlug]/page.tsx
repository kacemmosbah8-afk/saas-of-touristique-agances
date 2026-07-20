import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock, Check, X, Info, ShieldCheck } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { getPackageBySlug } from "@/features/packages/queries/get-package-by-slug.query";
import { Reveal } from "@/features/public-site/components/reveal";
import { Parallax } from "@/features/public-site/components/parallax";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string; packageSlug: string }>;
}) {
  const { tenantSlug, packageSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  const pkg = await getPackageBySlug(getTenantDb(tenant.id), packageSlug);
  if (!pkg) return {};
  return {
    title: pkg.seoTitle || pkg.name,
    description: pkg.seoDescription || pkg.shortDescription || undefined,
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

  const pkg = await getPackageBySlug(getTenantDb(tenant.id), packageSlug);
  if (!pkg) notFound();

  const location = [pkg.destination, pkg.country].filter(Boolean).join(", ");
  const duration =
    pkg.duration && pkg.durationNights
      ? `${pkg.duration} days / ${pkg.durationNights} nights`
      : pkg.duration
        ? `${pkg.duration} days`
        : null;
  const gallery = pkg.images;
  const bookHref = `/${tenantSlug}/book?package=${encodeURIComponent(pkg.slug)}`;
  const hasIncludedOrExcluded = pkg.includedServices.length > 0 || pkg.excludedServices.length > 0;

  return (
    <div>
      {/* Full-bleed hero — the header floats transparent over this */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <div className="bg-muted absolute inset-0 overflow-hidden">
          <Parallax strength={0.15} className="absolute -inset-y-16 inset-x-0">
            {pkg.coverImageUrl && (
              <Image
                src={pkg.coverImageUrl}
                alt={pkg.name}
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
            href={`/${tenantSlug}/packages`}
            className="mb-5 inline-block text-sm text-white/70 hover:text-white"
          >
            ← Packages
          </Link>
          <h1 className="text-[clamp(2.4rem,6vw,4.2rem)] leading-[1] font-semibold tracking-tight text-balance">
            {pkg.name}
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
                {pkg.difficulty}
              </Badge>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            {pkg.shortDescription && (
              <Reveal>
                <p className="text-lg leading-relaxed font-medium text-balance">
                  {pkg.shortDescription}
                </p>
              </Reveal>
            )}
            {pkg.description && (
              <Reveal delay={60}>
                <p className="text-muted-foreground mt-4 leading-relaxed whitespace-pre-line">
                  {pkg.description}
                </p>
              </Reveal>
            )}
          </div>
          <Reveal>
            <Button asChild size="lg" className="text-base">
              <Link href={bookHref}>Request to Book</Link>
            </Button>
          </Reveal>
        </div>

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
                    alt={img.alt || pkg.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 300px"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {pkg.highlights.length > 0 && (
          <Reveal as="section" className="mt-16">
            <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              Trip highlights
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">What makes this trip special</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {pkg.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px]">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {hasIncludedOrExcluded && (
          <Reveal as="section" className="mt-16">
            <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              The fine print
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">What&apos;s included</h2>
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              {pkg.includedServices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">Included</h3>
                  <ul className="mt-3 space-y-2">
                    {pkg.includedServices.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[15px]">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pkg.excludedServices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">Not included</h3>
                  <ul className="mt-3 space-y-2">
                    {pkg.excludedServices.map((s, i) => (
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

        {(pkg.whatToBring.length > 0 || pkg.importantNotes.length > 0) && (
          <Reveal as="section" className="mt-16 grid gap-10 sm:grid-cols-2">
            {pkg.whatToBring.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold tracking-tight">What to bring</h2>
                <ul className="mt-4 space-y-2">
                  {pkg.whatToBring.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[15px]">
                      <Check className="text-primary mt-0.5 size-4 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pkg.importantNotes.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Important notes</h2>
                <ul className="mt-4 space-y-2">
                  {pkg.importantNotes.map((item, i) => (
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

        {(pkg.meetingPoint || pkg.cancellationPolicy) && (
          <Reveal as="section" className="border-border/70 mt-16 grid gap-10 border-t pt-12 sm:grid-cols-2">
            {pkg.meetingPoint && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <MapPin className="text-primary size-4" />
                  Meeting point
                </h2>
                <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
                  {pkg.meetingPoint}
                </p>
              </div>
            )}
            {pkg.cancellationPolicy && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <ShieldCheck className="text-primary size-4" />
                  Cancellation policy
                </h2>
                <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed whitespace-pre-line">
                  {pkg.cancellationPolicy}
                </p>
              </div>
            )}
          </Reveal>
        )}

        <Reveal as="section" className="mt-16 rounded-2xl border p-10 text-center sm:p-14">
          <p className="font-serif text-2xl font-semibold text-balance">
            Ready to book {pkg.name}?
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
              href={`/${tenantSlug}/contact?package=${encodeURIComponent(pkg.slug)}`}
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
