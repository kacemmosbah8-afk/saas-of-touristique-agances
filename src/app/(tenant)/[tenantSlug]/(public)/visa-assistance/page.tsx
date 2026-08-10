import { notFound } from "next/navigation";

import { getCachedTenant } from "@/shared/lib/db";
import {
  getCachedAgencyProfile,
  listPublicPackages,
  listPublicDestinations,
} from "@/features/public-site/lib/public-cache";
import { VisaRequestForm } from "@/features/public-site/components/visa-request-form";
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
  return { title: `${dict.visaAssistance.title} — ${tenant.name}` };
}

export default async function VisaAssistancePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const [profile, locale, packagesResult, destinationsResult] = await Promise.all([
    getCachedAgencyProfile(tenant.id),
    getVisitorLocale(),
    listPublicPackages(tenant.id, { status: "PUBLISHED" }),
    listPublicDestinations(tenant.id, { status: "ACTIVE" }),
  ]);
  const dict = getDictionary(locale);
  const imageUrl =
    packagesResult.packages[0]?.coverImageUrl ?? destinationsResult.destinations[0]?.heroImageUrl ?? null;

  const imageCaption = (
    <>
      <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">
        {dict.visaAssistance.eyebrow}
      </p>
      <p className="mt-1 font-serif text-2xl font-semibold text-balance">{tenant.name}</p>
    </>
  );

  return (
    <SplitScreen imageUrl={imageUrl} imageAlt={tenant.name} imageCaption={imageCaption}>
      <Reveal>
        <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
          {dict.visaAssistance.eyebrow}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {dict.visaAssistance.title}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">{dict.visaAssistance.intro}</p>

        <div className="mt-10">
          <VisaRequestForm
            tenantSlug={tenantSlug}
            locale={locale}
            dict={dict}
            whatsapp={profile.whatsapp || null}
            businessHours={profile.businessHours || null}
          />
        </div>
      </Reveal>
    </SplitScreen>
  );
}
