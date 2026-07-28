import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type FlightImageItem = {
  id: string;
  url: string;
  alt: string | null;
  altFr: string | null;
};

export type FlightDetail = {
  id: string;
  name: string;
  nameFr: string | null;
  slug: string;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  shortDescription: string | null;
  shortDescriptionFr: string | null;
  description: string | null;
  descriptionFr: string | null;
  airline: string | null;
  airlineLogoUrl: string | null;
  flightNumber: string | null;
  departureCity: string | null;
  departureCityFr: string | null;
  departureAirport: string | null;
  departureAirportFr: string | null;
  departureCountry: string | null;
  departureCountryFr: string | null;
  arrivalCity: string | null;
  arrivalCityFr: string | null;
  arrivalAirport: string | null;
  arrivalAirportFr: string | null;
  arrivalCountry: string | null;
  arrivalCountryFr: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  durationMinutes: number | null;
  stops: number;
  cabinClass: string | null;
  cabinClassFr: string | null;
  basePrice: number | null;
  currency: string;
  coverImageKey: string | null;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoTitleFr: string | null;
  seoDescription: string | null;
  seoDescriptionFr: string | null;
  createdAt: Date;
  updatedAt: Date;
  images: FlightImageItem[];
};

export async function getFlight(db: TenantDb, flightId: string): Promise<FlightDetail | null> {
  const flight = await db.flight.findFirst({
    where: { id: flightId, deletedAt: null },
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
