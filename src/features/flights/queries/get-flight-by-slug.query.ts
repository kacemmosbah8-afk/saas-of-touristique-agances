import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";
import type { FlightDetail } from "@/features/flights/queries/get-flight.query";

/**
 * Public storefront lookup — only ever returns a `PUBLISHED` flight. An
 * unpublished or unknown slug returns `null`, which callers should render
 * as a 404, not an error.
 */
export async function getFlightBySlug(
  db: TenantDb,
  slug: string,
): Promise<FlightDetail | null> {
  const flight = await db.flight.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: { images: { orderBy: { position: "asc" } } },
  });
  if (!flight) return null;

  return {
    id: flight.id,
    name: flight.name,
    nameFr: flight.nameFr,
    slug: flight.slug,
    featured: flight.featured,
    status: flight.status,
    shortDescription: flight.shortDescription,
    shortDescriptionFr: flight.shortDescriptionFr,
    description: flight.description,
    descriptionFr: flight.descriptionFr,
    airline: flight.airline,
    airlineLogoUrl: flight.airlineLogoUrl,
    flightNumber: flight.flightNumber,
    departureCity: flight.departureCity,
    departureCityFr: flight.departureCityFr,
    departureAirport: flight.departureAirport,
    departureAirportFr: flight.departureAirportFr,
    departureCountry: flight.departureCountry,
    departureCountryFr: flight.departureCountryFr,
    arrivalCity: flight.arrivalCity,
    arrivalCityFr: flight.arrivalCityFr,
    arrivalAirport: flight.arrivalAirport,
    arrivalAirportFr: flight.arrivalAirportFr,
    arrivalCountry: flight.arrivalCountry,
    arrivalCountryFr: flight.arrivalCountryFr,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    durationMinutes: flight.durationMinutes,
    stops: flight.stops,
    cabinClass: flight.cabinClass,
    cabinClassFr: flight.cabinClassFr,
    basePrice: toNumber(flight.basePrice),
    currency: flight.currency,
    coverImageKey: flight.coverImageKey,
    coverImageUrl: flight.coverImageUrl,
    seoTitle: flight.seoTitle,
    seoTitleFr: flight.seoTitleFr,
    seoDescription: flight.seoDescription,
    seoDescriptionFr: flight.seoDescriptionFr,
    createdAt: flight.createdAt,
    updatedAt: flight.updatedAt,
    images: flight.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, altFr: i.altFr })),
  };
}
