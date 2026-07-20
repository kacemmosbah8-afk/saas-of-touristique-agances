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
    slug: flight.slug,
    featured: flight.featured,
    status: flight.status,
    shortDescription: flight.shortDescription,
    description: flight.description,
    airline: flight.airline,
    airlineLogoUrl: flight.airlineLogoUrl,
    flightNumber: flight.flightNumber,
    departureCity: flight.departureCity,
    departureAirport: flight.departureAirport,
    departureCountry: flight.departureCountry,
    arrivalCity: flight.arrivalCity,
    arrivalAirport: flight.arrivalAirport,
    arrivalCountry: flight.arrivalCountry,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    durationMinutes: flight.durationMinutes,
    stops: flight.stops,
    cabinClass: flight.cabinClass,
    basePrice: toNumber(flight.basePrice),
    currency: flight.currency,
    coverImageKey: flight.coverImageKey,
    coverImageUrl: flight.coverImageUrl,
    seoTitle: flight.seoTitle,
    seoDescription: flight.seoDescription,
    createdAt: flight.createdAt,
    updatedAt: flight.updatedAt,
    images: flight.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
  };
}
