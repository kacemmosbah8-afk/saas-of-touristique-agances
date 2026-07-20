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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  return { title: `Contact — ${tenant.name}` };
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
  const [profile, pkg, hotel, destination, activity, flight] = await Promise.all([
    getAgencyProfile(tenant.id),
    packageSlug ? getPackageBySlug(db, packageSlug) : null,
    hotelSlug ? getHotelBySlug(db, hotelSlug) : null,
    destinationSlug ? getDestinationBySlug(db, destinationSlug) : null,
    activitySlug ? getActivityBySlug(db, activitySlug) : null,
    flightSlug ? getFlightBySlug(db, flightSlug) : null,
  ]);

  const reference: InquiryReference | null = pkg
    ? { kind: "package", slug: pkg.slug, name: pkg.name }
    : hotel
      ? { kind: "hotel", slug: hotel.slug, name: hotel.name }
      : destination
        ? { kind: "destination", slug: destination.slug, name: destination.name }
        : activity
          ? { kind: "activity", slug: activity.slug, name: activity.name }
          : flight
            ? { kind: "flight", slug: flight.slug, name: flight.name }
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

  const imageCaption = reference ? (
    <>
      <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">Regarding</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-balance">{reference.name}</p>
    </>
  ) : (
    <>
      <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">
        {tenant.name}
      </p>
      {profile.tagline && (
        <p className="mt-1 font-serif text-2xl font-semibold text-balance">{profile.tagline}</p>
      )}
    </>
  );

  const hasContactInfo =
    profile.contactEmail || profile.contactPhone || profile.whatsapp || profile.address;

  return (
    <SplitScreen imageUrl={imageUrl} imageAlt={reference?.name ?? tenant.name} imageCaption={imageCaption}>
      <Reveal>
        <p className="text-brand-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
          Get in touch
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Contact Us
        </h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          Have a question or want to plan your next trip? Send us a message.
        </p>

        <div className="mt-10">
          <InquiryForm tenantSlug={tenantSlug} reference={reference} />
        </div>

        {hasContactInfo && (
          <div className="mt-12 space-y-3 border-t pt-8 text-sm">
            <h2 className="font-serif text-lg font-semibold">Other ways to reach us</h2>
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
            {profile.address && (
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="size-4 shrink-0" />
                {profile.address}
              </p>
            )}
            {profile.businessHours && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Clock className="size-4 shrink-0" />
                {profile.businessHours}
              </p>
            )}
          </div>
        )}
      </Reveal>
    </SplitScreen>
  );
}
