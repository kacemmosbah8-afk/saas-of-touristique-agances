import { notFound } from "next/navigation";
import { Mail, Phone, MessageCircle, MapPin, Clock } from "lucide-react";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { getAgencyProfile } from "@/features/settings/queries/settings.query";
import { getPackageBySlug } from "@/features/packages/queries/get-package-by-slug.query";
import { getHotelBySlug } from "@/features/hotels/queries/get-hotel-by-slug.query";
import { getDestinationBySlug } from "@/features/destinations/queries/get-destination-by-slug.query";
import { getActivityBySlug } from "@/features/activities/queries/get-activity-by-slug.query";
import { getFlightBySlug } from "@/features/flights/queries/get-flight-by-slug.query";
import { listPackages } from "@/features/packages/queries/list-packages.query";
import { listDestinations } from "@/features/destinations/queries/list-destinations.query";
import { InquiryForm, type InquiryReference } from "@/features/public-site/components/inquiry-form";
import { SplitScreen } from "@/features/public-site/components/split-screen";
import { Reveal } from "@/features/public-site/components/reveal";
import { getDictionary } from "@/shared/i18n/dictionary";
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
  return { title: `${dict.contact.title} — ${tenant.name}` };
}

export default async function PublicContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{
    package?: string;
    hotel?: string;
    destination?: string;
    activity?: string;
    flight?: string;
  }>;
}) {
  const { tenantSlug } = await params;
  const {
    package: packageSlug,
    hotel: hotelSlug,
    destination: destinationSlug,
    activity: activitySlug,
    flight: flightSlug,
  } = await searchParams;

  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) notFound();

  const db = getTenantDb(tenant.id);
  const [profile, locale, pkg, hotel, destination, activity, flight] = await Promise.all([
    getAgencyProfile(tenant.id),
    getVisitorLocale(),
    packageSlug ? getPackageBySlug(db, packageSlug) : null,
    hotelSlug ? getHotelBySlug(db, hotelSlug) : null,
    destinationSlug ? getDestinationBySlug(db, destinationSlug) : null,
    activitySlug ? getActivityBySlug(db, activitySlug) : null,
    flightSlug ? getFlightBySlug(db, flightSlug) : null,
  ]);

  const dict = getDictionary(locale);

  const reference: InquiryReference | null = pkg
    ? { kind: "package", slug: pkg.slug, name: localize(locale, pkg.name, pkg.nameFr) }
    : hotel
      ? { kind: "hotel", slug: hotel.slug, name: localize(locale, hotel.name, hotel.nameFr) }
      : destination
        ? { kind: "destination", slug: destination.slug, name: localize(locale, destination.name, destination.nameFr) }
        : activity
          ? { kind: "activity", slug: activity.slug, name: localize(locale, activity.name, activity.nameFr) }
          : flight
            ? { kind: "flight", slug: flight.slug, name: localize(locale, flight.name, flight.nameFr) }
            : null;

  const referenceImageUrl = pkg
    ? pkg.coverImageUrl
    : hotel
      ? hotel.coverImageUrl
      : destination
        ? destination.heroImageUrl
        : activity
          ? activity.coverImageUrl
          : flight
            ? flight.coverImageUrl
            : null;

  let imageUrl = referenceImageUrl;
  if (!reference) {
    const [packagesResult, destinationsResult] = await Promise.all([
      listPackages(db, { status: "PUBLISHED" }),
      listDestinations(db, { status: "ACTIVE" }),
    ]);
    imageUrl =
      packagesResult.packages[0]?.coverImageUrl ??
      destinationsResult.destinations[0]?.heroImageUrl ??
      null;
  }

  const tagline = localize(locale, profile.tagline ?? "", profile.taglineFr);
  const address = localize(locale, profile.address ?? "", profile.addressFr);
  const businessHours = localize(locale, profile.businessHours ?? "", profile.businessHoursFr);

  const imageCaption = reference ? (
    <>
      <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">{dict.contact.regarding}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-balance">{reference.name}</p>
    </>
  ) : (
    <>
      <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">
        {tenant.name}
      </p>
      {tagline && <p className="mt-1 font-serif text-2xl font-semibold text-balance">{tagline}</p>}
    </>
  );

  const hasContactInfo =
    profile.contactEmail || profile.contactPhone || profile.whatsapp || profile.address;

  return (
    <SplitScreen imageUrl={imageUrl} imageAlt={reference?.name ?? tenant.name} imageCaption={imageCaption}>
      <Reveal>
        <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
          {dict.contact.getInTouch}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {dict.contact.title}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">{dict.contact.intro}</p>

        <div className="mt-10">
          <InquiryForm
            tenantSlug={tenantSlug}
            reference={reference}
            dict={dict}
            whatsapp={profile.whatsapp || null}
            businessHours={profile.businessHours || null}
          />
        </div>

        {hasContactInfo && (
          <div className="mt-12 space-y-3 border-t pt-8 text-sm">
            <h2 className="font-serif text-lg font-semibold">{dict.contact.otherWays}</h2>
            {profile.contactEmail && (
              <a
                href={`mailto:${profile.contactEmail}`}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <Mail className="size-4 shrink-0" />
                {profile.contactEmail}
              </a>
            )}
            {profile.contactPhone && (
              <a
                href={`tel:${profile.contactPhone}`}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <Phone className="size-4 shrink-0" />
                {profile.contactPhone}
              </a>
            )}
            {profile.whatsapp && (
              <a
                href={`https://wa.me/${profile.whatsapp.replace(/[^\d+]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <MessageCircle className="size-4 shrink-0" />
                WhatsApp
              </a>
            )}
            {address && (
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="size-4 shrink-0" />
                {address}
              </p>
            )}
            {businessHours && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Clock className="size-4 shrink-0" />
                {businessHours}
              </p>
            )}
          </div>
        )}
      </Reveal>
    </SplitScreen>
  );
}
