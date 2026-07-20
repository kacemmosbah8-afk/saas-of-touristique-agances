import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type FlightImageItem = { id: string; url: string; alt: string | null };

export type FlightDetail = {
  id: string;
  name: string;
  slug: string;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  shortDescription: string | null;
  description: string | null;
  airline: string | null;
  airlineLogoUrl: string | null;
  flightNumber: string | null;
  departureCity: string | null;
  departureAirport: string | null;
  departureCountry: string | null;
  arrivalCity: string | null;
  arrivalAirport: string | null;
  arrivalCountry: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  durationMinutes: number | null;
  stops: number;
  cabinClass: string | null;
  basePrice: number | null;
  currency: string;
  coverImageKey: string | null;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
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
