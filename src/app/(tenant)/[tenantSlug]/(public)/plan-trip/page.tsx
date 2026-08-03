import { notFound } from "next/navigation";

import { getCachedTenant } from "@/shared/lib/db";
import { listPublicPackages, listPublicDestinations } from "@/features/public-site/lib/public-cache";
import { PlanTripForm } from "@/features/public-site/components/plan-trip-form";
import { SplitScreen } from "@/features/public-site/components/split-screen";
import { Reveal } from "@/features/public-site/components/reveal";
import { getDictionary } from "@/shared/i18n/dictionary";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";

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
  return { title: `${dict.planTrip.title} — ${tenant.name}` };
}

/**
 * "Plan My Trip" — a short qualifying quiz (destination/budget/period/
 * travelers/style) for a visitor who hasn't picked a specific package yet.
 * Deliberately not the same form as `/contact` (a free-text message) or a
 * package's "Request to Book" (always tied to one specific product) — see
 * `planTripSchema`. Every submission becomes a pre-qualified Lead in the
 * admin Leads inbox, not a booking.
 */
export default async function PlanTripPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const [locale, packagesResult, destinationsResult] = await Promise.all([
    getVisitorLocale(),
    listPublicPackages(tenant.id, { status: "PUBLISHED" }),
    listPublicDestinations(tenant.id, { status: "ACTIVE" }),
  ]);
  const dict = getDictionary(locale);
  const imageUrl =
    packagesResult.packages[0]?.coverImageUrl ?? destinationsResult.destinations[0]?.heroImageUrl ?? null;

  return (
    <SplitScreen
      imageUrl={imageUrl}
      imageAlt={tenant.name}
      imageCaption={
        <>
          <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">{tenant.name}</p>
          <p className="mt-1 font-serif text-2xl font-semibold text-balance">{dict.planTrip.title}</p>
        </>
      }
    >
      <Reveal>
        <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
          {dict.planTrip.eyebrow}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {dict.planTrip.title}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">{dict.planTrip.intro}</p>

        <div className="mt-10">
          <PlanTripForm tenantSlug={tenantSlug} dict={dict} />
        </div>
      </Reveal>
    </SplitScreen>
  );
}
