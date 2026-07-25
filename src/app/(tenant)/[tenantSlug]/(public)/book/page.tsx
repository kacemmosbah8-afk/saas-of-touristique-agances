import { notFound } from "next/navigation";
import Link from "next/link";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
import { getAgencyProfile } from "@/features/settings/queries/settings.query";
import { getPackageBySlug } from "@/features/packages/queries/get-package-by-slug.query";
import { getHotelBySlug } from "@/features/hotels/queries/get-hotel-by-slug.query";
import { getDestinationBySlug } from "@/features/destinations/queries/get-destination-by-slug.query";
import { getActivityBySlug } from "@/features/activities/queries/get-activity-by-slug.query";
import { getFlightBySlug } from "@/features/flights/queries/get-flight-by-slug.query";
import {
  BookingRequestForm,
  type BookingRequestReference,
} from "@/features/public-site/components/booking-request-form";
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
  return { title: `${dict.booking.title} — ${tenant.name}` };
}

export default async function PublicBookPage({
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
  const KIND_LABEL: Record<BookingRequestReference["kind"], string> = {
    package: dict.booking.kindLabels.package,
    hotel: dict.booking.kindLabels.hotel,
    destination: dict.booking.kindLabels.destination,
    activity: dict.booking.kindLabels.activity,
    flight: dict.booking.kindLabels.flight,
  };

  const reference: BookingRequestReference | null = pkg
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

  if (!reference) notFound();

  const imageUrl = pkg
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

  const imageCaption = (
    <>
      <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">
        {KIND_LABEL[reference.kind]}
      </p>
      <p className="mt-1 font-serif text-2xl font-semibold text-balance">{reference.name}</p>
    </>
  );

  return (
    <SplitScreen imageUrl={imageUrl} imageAlt={reference.name} imageCaption={imageCaption}>
      <Reveal>
        <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
          {dict.booking.almostThere}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {dict.booking.title}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          {dict.booking.intro}{" "}
          {dict.booking.preferGeneral}{" "}
          <Link href={`/${tenantSlug}/contact`} className="text-primary hover:underline">
            {dict.booking.contactLink}
          </Link>
          .
        </p>

        <div className="mt-10">
          <BookingRequestForm
            tenantSlug={tenantSlug}
            reference={reference}
            whatsapp={profile.whatsapp || null}
            businessHours={profile.businessHours || null}
            dict={dict}
          />
        </div>
      </Reveal>
    </SplitScreen>
  );
}
