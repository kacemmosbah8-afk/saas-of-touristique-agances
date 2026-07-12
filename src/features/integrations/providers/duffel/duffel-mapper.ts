import type {
  AirlineDto,
  AirportDto,
  FlightOfferDto,
  FlightSegmentDto,
  FlightSliceDto,
} from "@/features/integrations/lib/dto";

/**
 * Maps Duffel wire formats into TravelOS DTOs. All access is defensive —
 * a missing field degrades to null rather than throwing, so a partial
 * provider response never crashes a search.
 */

type Raw = Record<string, unknown>;

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function obj(value: unknown): Raw {
  return value != null && typeof value === "object" ? (value as Raw) : {};
}

function arr(value: unknown): Raw[] {
  return Array.isArray(value) ? (value as Raw[]) : [];
}

/** ISO-8601 duration ("PT7H30M") → "7h 30m". */
export function formatIsoDuration(value: unknown): string | null {
  const iso = str(value);
  if (!iso) return null;
  const match = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
  if (!match) return null;
  const [, days, hours, minutes] = match;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  return parts.length > 0 ? parts.join(" ") : null;
}

export class DuffelMapper {
  toAirportDto(raw: Raw): AirportDto {
    const city = obj(raw.city);
    return {
      iataCode: str(raw.iata_code) ?? "",
      name: str(raw.name) ?? "Unknown airport",
      cityName: str(raw.city_name) ?? str(city.name),
      countryCode: str(raw.iata_country_code),
      latitude: num(raw.latitude),
      longitude: num(raw.longitude),
      timeZone: str(raw.time_zone),
    };
  }

  toAirlineDto(raw: Raw): AirlineDto {
    return {
      iataCode: str(raw.iata_code) ?? "",
      name: str(raw.name) ?? "Unknown airline",
      logoUrl: str(raw.logo_symbol_url) ?? str(raw.logo_lockup_url),
    };
  }

  private toSegmentDto(raw: Raw): FlightSegmentDto {
    const origin = obj(raw.origin);
    const destination = obj(raw.destination);
    const carrier = obj(raw.marketing_carrier);
    const passengers = arr(raw.passengers);
    const cabin = str(obj(passengers[0]).cabin_class_marketing_name) ?? str(obj(passengers[0]).cabin_class);

    return {
      origin: str(origin.iata_code) ?? "",
      destination: str(destination.iata_code) ?? "",
      departingAt: str(raw.departing_at) ?? "",
      arrivingAt: str(raw.arriving_at) ?? "",
      carrierName: str(carrier.name),
      carrierIata: str(carrier.iata_code),
      flightNumber: str(raw.marketing_carrier_flight_number),
      durationText: formatIsoDuration(raw.duration),
      cabin,
    };
  }

  private toSliceDto(raw: Raw): FlightSliceDto {
    const origin = obj(raw.origin);
    const destination = obj(raw.destination);
    return {
      origin: str(origin.iata_code) ?? "",
      destination: str(destination.iata_code) ?? "",
      durationText: formatIsoDuration(raw.duration),
      segments: arr(raw.segments).map((s) => this.toSegmentDto(s)),
    };
  }

  toOfferDto(raw: Raw): FlightOfferDto {
    const owner = obj(raw.owner);
    const slices = arr(raw.slices).map((s) => this.toSliceDto(s));
    const firstSegment = slices[0]?.segments[0];

    return {
      id: str(raw.id) ?? "",
      totalAmount: num(raw.total_amount) ?? 0,
      currency: str(raw.total_currency) ?? "USD",
      ownerName: str(owner.name),
      ownerIata: str(owner.iata_code),
      ownerLogoUrl: str(owner.logo_symbol_url),
      cabin: firstSegment?.cabin ?? null,
      expiresAt: str(raw.expires_at),
      slices,
      passengerCount: arr(raw.passengers).length,
    };
  }
}
