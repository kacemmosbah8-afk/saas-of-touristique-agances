import "server-only";

import { providerRequest } from "@/features/integrations/lib/http";
import type { HotelbedsCredentials } from "@/features/integrations/lib/credentials";
import { hotelbedsSignature } from "@/features/integrations/providers/hotelbeds/hotelbeds-signature";
import type {
  ActivitySummaryDto,
  CancelHotelBookingDto,
  CountryDto,
  CreateHotelBookingInput,
  DestinationDto,
  FacilityDto,
  HealthCheckResult,
  HotelAvailabilityDto,
  HotelAvailabilitySearch,
  HotelBookingDto,
  HotelDetailDto,
  HotelRateCheckDto,
  HotelSummaryDto,
  TransferOptionDto,
} from "@/features/integrations/lib/dto";
import { HotelbedsMapper } from "@/features/integrations/providers/hotelbeds/hotelbeds-mapper";

const PROVIDER = "hotelbeds";

/** Hotelbeds test keys allow low throughput; keep well inside the quota. */
const RATE_LIMIT = { limit: 3, windowMs: 1_000, maxWaitMs: 5_000 };

type Raw = Record<string, unknown>;

/**
 * Hotelbeds API client. Constructed per request with the caller's credentials
 * and environment — no ambient/env keys — so each tenant's calls are signed
 * with that tenant's own API key and secret.
 */
export class HotelbedsClient {
  private readonly mapper = new HotelbedsMapper();

  constructor(private readonly credentials: HotelbedsCredentials) {}

  get environment(): "test" | "live" {
    return this.credentials.environment;
  }

  private baseUrl(): string {
    return this.credentials.environment === "live"
      ? "https://api.hotelbeds.com"
      : "https://api.test.hotelbeds.com";
  }

  private headers(): Record<string, string> {
    const { apiKey, secret } = this.credentials;
    return {
      "Api-key": apiKey,
      "X-Signature": hotelbedsSignature(apiKey, secret, Math.floor(Date.now() / 1000)),
    };
  }

  private async get<T>(path: string): Promise<{ data: T; durationMs: number }> {
    const res = await providerRequest<T>({
      provider: PROVIDER,
      method: "GET",
      url: `${this.baseUrl()}${path}`,
      headers: this.headers(),
      rateLimit: RATE_LIMIT,
    });
    return { data: res.data, durationMs: res.durationMs };
  }

  private async post<T>(path: string, body: unknown): Promise<{ data: T; durationMs: number }> {
    const res = await providerRequest<T>({
      provider: PROVIDER,
      method: "POST",
      url: `${this.baseUrl()}${path}`,
      headers: this.headers(),
      body,
      timeoutMs: 30_000,
      rateLimit: RATE_LIMIT,
    });
    return { data: res.data, durationMs: res.durationMs };
  }

  private async delete<T>(path: string): Promise<{ data: T; durationMs: number }> {
    const res = await providerRequest<T>({
      provider: PROVIDER,
      method: "DELETE",
      url: `${this.baseUrl()}${path}`,
      headers: this.headers(),
      timeoutMs: 30_000,
      rateLimit: RATE_LIMIT,
    });
    return { data: res.data, durationMs: res.durationMs };
  }

  // ------------------------------------------------------------- Health

  async healthCheck(): Promise<HealthCheckResult> {
    const { data, durationMs } = await this.get<Raw>("/hotel-api/1.0/status");
    const status = typeof data.status === "string" ? data.status : "OK";
    return {
      ok: true,
      latencyMs: durationMs,
      message: `Hotelbeds ${this.credentials.environment} API reachable (status: ${status}).`,
    };
  }

  // --------------------------------------------------- Content API reads

  async searchDestinations(query: string, limit = 25): Promise<DestinationDto[]> {
    // The content API has no free-text search; fetch a page and filter.
    // Callers cache this via the cache layer, so the page fetch is amortized.
    const { data } = await this.get<Raw>(
      `/hotel-content-api/1.0/locations/destinations?fields=all&language=ENG&from=1&to=500&useSecondaryLanguage=false`,
    );
    const all = this.mapper.toDestinationDtos(data);
    const q = query.trim().toLowerCase();
    if (!q) return all.slice(0, limit);
    return all
      .filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase() === q ||
          (d.countryCode ?? "").toLowerCase() === q,
      )
      .slice(0, limit);
  }

  async listDestinations(from: number, to: number): Promise<{ destinations: DestinationDto[]; total: number }> {
    const { data } = await this.get<Raw>(
      `/hotel-content-api/1.0/locations/destinations?fields=all&language=ENG&from=${from}&to=${to}&useSecondaryLanguage=false`,
    );
    return {
      destinations: this.mapper.toDestinationDtos(data),
      total: typeof data.total === "number" ? data.total : 0,
    };
  }

  async listCountries(): Promise<CountryDto[]> {
    const { data } = await this.get<Raw>(
      `/hotel-content-api/1.0/locations/countries?fields=all&language=ENG&from=1&to=500&useSecondaryLanguage=false`,
    );
    return this.mapper.toCountryDtos(data);
  }

  async listFacilities(): Promise<FacilityDto[]> {
    const { data } = await this.get<Raw>(
      `/hotel-content-api/1.0/types/facilities?fields=all&language=ENG&from=1&to=500&useSecondaryLanguage=false`,
    );
    return this.mapper.toFacilityDtos(data);
  }

  async listHotels(
    from: number,
    to: number,
    destinationCode?: string,
  ): Promise<{ hotels: HotelSummaryDto[]; total: number }> {
    const dest = destinationCode ? `&destinationCode=${encodeURIComponent(destinationCode)}` : "";
    const { data } = await this.get<Raw>(
      `/hotel-content-api/1.0/hotels?fields=all&language=ENG&from=${from}&to=${to}${dest}&useSecondaryLanguage=false`,
    );
    return {
      hotels: this.mapper.toHotelSummaryDtos(data),
      total: typeof data.total === "number" ? data.total : 0,
    };
  }

  async getHotelDetails(code: string): Promise<HotelDetailDto> {
    const { data } = await this.get<Raw>(
      `/hotel-content-api/1.0/hotels/${encodeURIComponent(code)}/details?language=ENG&useSecondaryLanguage=false`,
    );
    return this.mapper.toHotelDetailDto(data);
  }

  // ---------------------------------------------------- Booking API reads

  async searchAvailability(search: HotelAvailabilitySearch): Promise<HotelAvailabilityDto[]> {
    const { data } = await this.post<Raw>("/hotel-api/1.0/hotels", {
      stay: { checkIn: search.checkIn, checkOut: search.checkOut },
      occupancies: [
        {
          rooms: search.rooms,
          adults: search.adults,
          children: search.children,
          ...(search.children > 0
            ? { paxes: Array.from({ length: search.children }, () => ({ type: "CH", age: 8 })) }
            : {}),
        },
      ],
      destination: { code: search.destinationCode.toUpperCase() },
    });
    return this.mapper.toAvailabilityDtos(data);
  }

  /**
   * Re-validate a rate live before booking. Mandatory for RECHECK rates —
   * their searched price is indicative only. Returns the hotel with the
   * rate re-priced (the returned rateKey supersedes the searched one), or
   * null when the rate is no longer available.
   */
  async checkRates(rateKey: string): Promise<HotelRateCheckDto | null> {
    const { data } = await this.post<Raw>("/hotel-api/1.0/checkrates", {
      rooms: [{ rateKey }],
    });
    return this.mapper.toRateCheckDto(data);
  }

  /**
   * Creates a real booking against the tenant's Hotelbeds credit account —
   * unlike Duffel, Hotelbeds has no "hold" concept; this call commits
   * immediately (see `HotelbedsExecutionProvider`, "always BALANCE").
   * Returns `null` only when Hotelbeds' 200 response carries no
   * `booking.reference` — an availability/pricing rejection reported as a
   * business failure rather than an HTTP error, which does happen on this
   * endpoint. A non-2xx response still throws via `providerRequest`.
   */
  async createBooking(input: CreateHotelBookingInput): Promise<HotelBookingDto | null> {
    const { data } = await this.post<Raw>(
      "/hotel-api/1.0/bookings",
      this.mapper.toCreateBookingPayload(input),
    );
    return this.mapper.toHotelBookingDto(data);
  }

  /**
   * Re-fetches a booking's current status — the closest thing Hotelbeds
   * offers to reconciling an `AWAITING_SUPPLIER_CONFIRMATION` ("ON
   * REQUEST") booking, though nothing calls this automatically yet (no
   * polling/webhook infrastructure — see PROJECT.md gap analysis).
   */
  async getBookingStatus(reference: string): Promise<HotelBookingDto | null> {
    const { data } = await this.get<Raw>(`/hotel-api/1.0/bookings/${encodeURIComponent(reference)}`);
    return this.mapper.toHotelBookingDto(data);
  }

  /**
   * Cancels a booking — a single call, unlike Duffel's two-step quote-then-
   * confirm cancellation. `cancellationFlag=CANCELLATION` (rather than
   * Hotelbeds' `SIMULATION` mode) makes this a real, binding cancellation.
   */
  async cancelBooking(reference: string): Promise<CancelHotelBookingDto | null> {
    const { data } = await this.delete<Raw>(
      `/hotel-api/1.0/bookings/${encodeURIComponent(reference)}?cancellationFlag=CANCELLATION`,
    );
    return this.mapper.toCancelBookingDto(data);
  }

  // ------------------------------------------------------- Activities API

  async searchActivities(
    destinationCode: string,
    from: string,
    to: string,
  ): Promise<ActivitySummaryDto[]> {
    const { data } = await this.post<Raw>("/activity-api/3.0/activities", {
      filters: [
        {
          searchFilterItems: [{ type: "destination", value: destinationCode.toUpperCase() }],
        },
      ],
      from,
      to,
      language: "en",
      pagination: { itemsPerPage: 20, page: 1 },
    });
    return this.mapper.toActivityDtos(data);
  }

  // -------------------------------------------------------- Transfers API

  async searchTransfers(params: {
    fromType: "IATA" | "ATLAS";
    fromCode: string;
    toType: "IATA" | "ATLAS";
    toCode: string;
    outbound: string; // ISO datetime
    adults: number;
    children: number;
    infants: number;
  }): Promise<TransferOptionDto[]> {
    const path =
      `/transfer-api/1.0/availability/en/from/${params.fromType}/${encodeURIComponent(params.fromCode.toUpperCase())}` +
      `/to/${params.toType}/${encodeURIComponent(params.toCode.toUpperCase())}` +
      `/${encodeURIComponent(params.outbound)}/${params.adults}/${params.children}/${params.infants}`;
    const { data } = await this.get<Raw>(path);
    return this.mapper.toTransferDtos(data);
  }
}

export function createHotelbedsClient(credentials: HotelbedsCredentials): HotelbedsClient {
  return new HotelbedsClient(credentials);
}
