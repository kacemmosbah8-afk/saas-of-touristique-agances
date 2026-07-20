import { notFound } from "next/navigation";
import Link from "next/link";

import { getTenantDb, getCachedTenant } from "@/shared/lib/db";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenant(tenantSlug);
  if (!tenant) return {};
  return { title: `Request to Book — ${tenant.name}` };
}

const KIND_LABEL: Record<BookingRequestReference["kind"], string> = {
  package: "Package",
  hotel: "Hotel",
  destination: "Destination",
  activity: "Activity",
  flight: "Flight",
};

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
  const [pkg, hotel, destination, activity, flight] = await Promise.all([
    packageSlug ? getPackageBySlug(db, packageSlug) : null,
    hotelSlug ? getHotelBySlug(db, hotelSlug) : null,
    destinationSlug ? getDestinationBySlug(db, destinationSlug) : null,
    activitySlug ? getActivityBySlug(db, activitySlug) : null,
    flightSlug ? getFlightBySlug(db, flightSlug) : null,
  ]);

  const reference: BookingRequestReference | null = pkg
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
          Almost there
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Request to Book
        </h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          Tell us your travel details and we&apos;ll confirm availability and pricing with you
          directly. Prefer to ask a general question instead?{" "}
          <Link href={`/${tenantSlug}/contact`} className="text-primary hover:underline">
            Contact us
          </Link>
          .
        </p>

        <div className="mt-10">
          <BookingRequestForm tenantSlug={tenantSlug} reference={reference} />
        </div>
      </Reveal>
    </SplitScreen>
  );
}
