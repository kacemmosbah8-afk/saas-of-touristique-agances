import type {
  AirportDto,
  FlightOfferDto,
  FlightSegmentDto,
  FlightSliceDto,
} from "@/features/integrations/lib/dto";
import { formatIsoDuration } from "@/features/integrations/providers/duffel/duffel-mapper";

/** Maps Amadeus self-service API responses into TravelOS DTOs. */

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
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Raw)
    : {};
}

function arr(value: unknown): Raw[] {
  return Array.isArray(value) ? (value as Raw[]) : [];
}

export class AmadeusMapper {
  toAirportDto(raw: Raw): AirportDto {
    const address = obj(raw.address);
    const geo = obj(raw.geoCode);
    return {
      iataCode: str(raw.iataCode) ?? "",
      name: str(raw.name) ?? "Unknown location",
      cityName: str(address.cityName),
      countryCode: str(address.countryCode),
      latitude: num(geo.latitude),
      longitude: num(geo.longitude),
      timeZone: str(obj(raw.timeZone).referenceLocalDateTime) ? null : str(raw.timeZoneOffset),
    };
  }

  private toSegmentDto(raw: Raw, carriers: Raw): FlightSegmentDto {
    const departure = obj(raw.departure);
    const arrival = obj(raw.arrival);
    const carrierCode = str(raw.carrierCode);
    return {
      origin: str(departure.iataCode) ?? "",
      destination: str(arrival.iataCode) ?? "",
      departingAt: str(departure.at) ?? "",
      arrivingAt: str(arrival.at) ?? "",
      carrierName: carrierCode ? (str(carriers[carrierCode]) ?? carrierCode) : null,
      carrierIata: carrierCode,
      flightNumber: str(raw.number),
      durationText: formatIsoDuration(raw.duration),
      cabin: null,
    };
  }

  toFlightOfferDto(raw: Raw, dictionaries: Raw): FlightOfferDto {
    const carriers = obj(dictionaries.carriers);
    const price = obj(raw.price);
    const itineraries = arr(raw.itineraries);
    const travelerPricings = arr(raw.travelerPricings);
    const firstCabin = str(
      obj(arr(obj(travelerPricings[0]).fareDetailsBySegment)[0]).cabin,
    );
    const validating = arr(raw.validatingAirlineCodes);
    const ownerIata = typeof validating[0] === "string" ? (validating[0] as unknown as string) : null;

    const slices: FlightSliceDto[] = itineraries.map((it) => {
      const segments = arr(it.segments).map((s) => this.toSegmentDto(s, carriers));
      return {
        origin: segments[0]?.origin ?? "",
        destination: segments[segments.length - 1]?.destination ?? "",
        durationText: formatIsoDuration(it.duration),
        segments,
      };
    });

    return {
      id: str(raw.id) ?? "",
      totalAmount: num(price.grandTotal) ?? num(price.total) ?? 0,
      currency: str(price.currency) ?? "USD",
      // Amadeus reports base + total; the difference approximates taxes/fees.
      taxAmount:
        num(price.total) != null && num(price.base) != null
          ? Math.max(0, (num(price.total) ?? 0) - (num(price.base) ?? 0))
          : null,
      ownerName: ownerIata ? (str(carriers[ownerIata]) ?? ownerIata) : null,
      ownerIata,
      ownerLogoUrl: null,
      cabin: firstCabin ? firstCabin.toLowerCase() : null,
      expiresAt: str(raw.lastTicketingDate),
      // Amadeus Self-Service offers carry no hold/payment metadata; booking
      // prep is a Duffel-only flow for now.
      paymentRequiredBy: null,
      priceGuaranteeExpiresAt: null,
      slices,
      passengerCount: travelerPricings.length,
      passengers: [],
      conditions: {
        refundableBeforeDeparture: null,
        refundPenaltyAmount: null,
        changeableBeforeDeparture: null,
        changePenaltyAmount: null,
      },
    };
  }
}
