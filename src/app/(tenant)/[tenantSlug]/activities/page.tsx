import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, MapPin, Clock } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { listActivities } from "@/features/activities/queries/list-activities.query";
import { Reveal } from "@/features/public-site/components/reveal";
import { cn } from "@/shared/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  return { title: `Activities — ${tenant.name}` };
}

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} hr${hours === 1 ? "" : "s"}`;
}

export default async function PublicActivitiesPage({
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

  const result = await listActivities(getTenantDb(tenant.id), {
    status: "ACTIVE",
    search: q || undefined,
    page: page ? Number(page) || 1 : 1,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
        <div>
          <p className="text-brand-sage mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
            {result.total} {result.total === 1 ? "experience" : "experiences"} to book
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Activities</h1>
        </div>
        <form
          className="border-border/70 flex w-full max-w-xs items-center gap-2 border-b pb-2 sm:w-auto"
          method="get"
        >
          <Search className="text-muted-foreground size-4 shrink-0" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search activities…"
            className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
          />
        </form>
      </div>

      {result.activities.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-16 text-center">
          {q ? "No activities match your search." : "No activities published yet. Check back soon."}
        </p>
      ) : (
        <div className="grid auto-rows-[220px] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {result.activities.map((activity, i) => {
            const tall = i % 5 === 0;
            const location = [activity.city, activity.country].filter(Boolean).join(", ");
            const duration = formatDuration(activity.durationMinutes);
            const meta = [location, duration].filter(Boolean).join(" · ");
            return (
              <Reveal
                key={activity.id}
                delay={(i % 8) * 60}
                className={cn("col-span-2 sm:col-span-1", tall && "row-span-2 sm:col-span-2")}
              >
                <Link
                  href={`/${tenantSlug}/activities/${activity.slug}`}
                  className="group relative block h-full w-full overflow-hidden rounded-2xl"
                >
                  <div className="bg-muted absolute inset-0">
                    {activity.coverImageUrl ? (
                      <Image
                        src={activity.coverImageUrl}
                        alt={activity.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes={tall ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 100vw, 25vw"}
                      />
                    ) : (
                      <div className="text-muted-foreground/50 flex h-full items-center justify-center text-sm">
                        No image yet
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent transition-opacity group-hover:from-black/85" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    {activity.category && (
                      <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-white/60 uppercase">
                        {activity.category}
                      </p>
                    )}
                    <p
                      className={cn(
                        "font-serif font-semibold text-white",
                        tall ? "text-2xl sm:text-3xl" : "text-lg",
                      )}
                    >
                      {activity.name}
                    </p>
                    {meta && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-white/75">
                        {location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5 shrink-0" />
                            {location}
                          </span>
                        )}
                        {duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5 shrink-0" />
                            {duration}
                          </span>
                        )}
                      </p>
                    )}
                    {activity.sellingPrice != null && (
                      <p className="mt-1.5 text-xs font-medium text-white/60">
                        From {activity.currency} {activity.sellingPrice.toLocaleString()}
                      </p>
                    )}
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
