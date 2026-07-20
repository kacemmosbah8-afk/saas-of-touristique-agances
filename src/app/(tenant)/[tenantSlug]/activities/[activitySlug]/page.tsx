import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock, Check, X } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { getActivityBySlug } from "@/features/activities/queries/get-activity-by-slug.query";
import { Reveal } from "@/features/public-site/components/reveal";
import { Parallax } from "@/features/public-site/components/parallax";
import { Button } from "@/shared/components/ui/button";

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string; activitySlug: string }>;
}) {
  const { tenantSlug, activitySlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  const activity = await getActivityBySlug(getTenantDb(tenant.id), activitySlug);
  if (!activity) return {};
  return { title: activity.name, description: activity.description || undefined };
}

export default async function PublicActivityDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; activitySlug: string }>;
}) {
  const { tenantSlug, activitySlug } = await params;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const activity = await getActivityBySlug(getTenantDb(tenant.id), activitySlug);
  if (!activity) notFound();

  const location = [activity.city, activity.country].filter(Boolean).join(", ");
  const duration = formatDuration(activity.durationMinutes);
  const bookHref = `/${tenantSlug}/book?activity=${encodeURIComponent(activity.slug)}`;

  return (
    <div>
      {/* Full-bleed hero — the header floats transparent over this */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <div className="bg-muted absolute inset-0 overflow-hidden">
          <Parallax strength={0.15} className="absolute -inset-y-16 inset-x-0">
            {activity.coverImageUrl && (
              <Image
                src={activity.coverImageUrl}
                alt={activity.name}
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
            href={`/${tenantSlug}/activities`}
            className="mb-5 inline-block text-sm text-white/70 hover:text-white"
          >
            ← Activities
          </Link>
          {activity.category && (
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">
              {activity.category}
            </p>
          )}
          <h1 className="text-[clamp(2.4rem,6vw,4.2rem)] leading-[1] font-semibold tracking-tight text-balance">
            {activity.name}
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
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          {activity.description && (
            <Reveal className="max-w-2xl">
              <p className="text-lg leading-relaxed whitespace-pre-line">{activity.description}</p>
            </Reveal>
          )}
          <Reveal className="flex flex-col items-start gap-3 sm:items-end">
            {activity.sellingPrice != null && (
              <p className="text-muted-foreground text-sm">
                From{" "}
                <span className="text-foreground text-xl font-semibold">
                  {activity.currency} {activity.sellingPrice.toLocaleString()}
                </span>
              </p>
            )}
            <Button asChild size="lg" className="text-base">
              <Link href={bookHref}>Request to Book</Link>
            </Button>
          </Reveal>
        </div>

        {activity.meetingPoint && (
          <Reveal as="section" className="mt-10">
            <p className="text-brand-sage mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
              Meeting point
            </p>
            <p className="text-[15px] leading-relaxed">{activity.meetingPoint}</p>
          </Reveal>
        )}

        {activity.images.length > 0 && (
          <Reveal className="mt-14">
            <div className="grid auto-rows-[160px] grid-cols-3 gap-3 sm:auto-rows-[220px] sm:gap-4">
              {activity.images.map((img, i) => (
                <div
                  key={img.id}
                  className={`bg-muted relative overflow-hidden rounded-xl ${
                    i % 5 === 0 ? "col-span-2 row-span-2" : "col-span-1"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt || activity.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 300px"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {(activity.includedItems.length > 0 || activity.excludedItems.length > 0) && (
          <Reveal as="section" className="mt-14">
            <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
              Good to know
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">What&apos;s Included</h2>
            <div className="mt-5 grid gap-8 sm:grid-cols-2">
              {activity.includedItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">Included</h3>
                  <ul className="mt-3 space-y-2.5">
                    {activity.includedItems.map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[15px]">
                        <Check className="text-primary mt-0.5 size-4 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activity.excludedItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold">Not Included</h3>
                  <ul className="mt-3 space-y-2.5">
                    {activity.excludedItems.map((s, i) => (
                      <li key={i} className="text-muted-foreground flex items-start gap-2.5 text-[15px]">
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

        <Reveal as="section" className="mt-16 rounded-2xl border p-10 text-center sm:p-14">
          <p className="font-serif text-2xl font-semibold text-balance">
            Interested in {activity.name}?
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
              href={`/${tenantSlug}/contact?activity=${encodeURIComponent(activity.slug)}`}
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
