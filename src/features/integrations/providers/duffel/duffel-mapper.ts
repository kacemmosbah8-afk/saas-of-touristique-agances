import type {
  AirlineDto,
  AirportDto,
  CreateOrderInput,
  FlightOfferConditionsDto,
  FlightOfferDto,
  FlightOrderDto,
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

  private toConditionsDto(raw: Raw): FlightOfferConditionsDto {
    const conditions = obj(raw.conditions);
    const refund = obj(conditions.refund_before_departure);
    const change = obj(conditions.change_before_departure);
    return {
      refundableBeforeDeparture:
        typeof refund.allowed === "boolean" ? refund.allowed : null,
      refundPenaltyAmount: num(refund.penalty_amount),
      changeableBeforeDeparture:
        typeof change.allowed === "boolean" ? change.allowed : null,
      changePenaltyAmount: num(change.penalty_amount),
    };
  }

  toOfferDto(raw: Raw): FlightOfferDto {
    const owner = obj(raw.owner);
    const slices = arr(raw.slices).map((s) => this.toSliceDto(s));
    const firstSegment = slices[0]?.segments[0];
    const passengers = arr(raw.passengers);
    const payment = obj(raw.payment_requirements);

    return {
      id: str(raw.id) ?? "",
      totalAmount: num(raw.total_amount) ?? 0,
      currency: str(raw.total_currency) ?? "USD",
      taxAmount: num(raw.tax_amount),
      ownerName: str(owner.name),
      ownerIata: str(owner.iata_code),
      ownerLogoUrl: str(owner.logo_symbol_url),
      cabin: firstSegment?.cabin ?? null,
      expiresAt: str(raw.expires_at),
      paymentRequiredBy: str(payment.payment_required_by),
      priceGuaranteeExpiresAt: str(payment.price_guarantee_expires_at),
      slices,
      passengerCount: passengers.length,
      passengers: passengers.map((p) => ({
        id: str(p.id) ?? "",
        type: str(p.type),
      })),
      conditions: this.toConditionsDto(raw),
    };
  }

  /** Builds the `POST /air/orders` request body from a provider-agnostic input. */
  toCreateOrderPayload(input: CreateOrderInput): Raw {
    return {
      type: input.type,
      selected_offers: [input.offerId],
      ...(input.payment
        ? {
            payments: [
              { type: "balance", amount: input.payment.amount, currency: input.payment.currency },
            ],
          }
        : {}),
      passengers: input.passengers.map((p) => ({
        id: p.providerPassengerId,
        given_name: p.givenName,
        family_name: p.familyName,
        born_on: p.bornOn,
        gender: p.gender,
        title: p.gender === "f" ? "ms" : "mr",
        email: p.email,
        phone_number: p.phoneNumber,
        ...(p.identityDocument
          ? {
              identity_documents: [
                {
                  type: "passport",
                  unique_identifier: p.identityDocument.uniqueIdentifier,
                  expires_on: p.identityDocument.expiresOn,
                  issuing_country_code: p.identityDocument.issuingCountryCode,
                },
              ],
            }
          : {}),
      })),
    };
  }

  toFlightOrderDto(raw: Raw): FlightOrderDto {
    const paymentStatus = obj(raw.payment_status);
    return {
      id: str(raw.id) ?? "",
      bookingReference: str(raw.booking_reference) ?? "",
      totalAmount: num(raw.total_amount) ?? 0,
      currency: str(raw.total_currency) ?? "USD",
      awaitingPayment: paymentStatus.awaiting_payment === true,
    };
  }
}
