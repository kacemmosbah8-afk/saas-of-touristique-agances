import "server-only";

import { env } from "@/shared/config/env";
import { NotConfiguredError } from "@/features/integrations/lib/errors";
import { providerRequest } from "@/features/integrations/lib/http";
import { hotelbedsSignature } from "@/features/integrations/providers/hotelbeds/hotelbeds-signature";
import type {
  ActivitySummaryDto,
  CountryDto,
  DestinationDto,
  FacilityDto,
  HealthCheckResult,
  HotelAvailabilityDto,
  HotelAvailabilitySearch,
  HotelDetailDto,
  HotelSummaryDto,
  TransferOptionDto,
} from "@/features/integrations/lib/dto";
import { HotelbedsMapper } from "@/features/integrations/providers/hotelbeds/hotelbeds-mapper";

const PROVIDER = "hotelbeds";

/** Hotelbeds test keys allow low throughput; keep well inside the quota. */
const RATE_LIMIT = { limit: 3, windowMs: 1_000, maxWaitMs: 5_000 };

type Raw = Record<string, unknown>;

export class HotelbedsClient {
  private readonly mapper = new HotelbedsMapper();

  isConfigured(): boolean {
    return !!env.HOTELBEDS_HOTEL_API_KEY && !!env.HOTELBEDS_HOTEL_SECRET;
  }

  private baseUrl(): string {
    return env.HOTELBEDS_ENVIRONMENT === "live"
      ? "https://api.hotelbeds.com"
      : "https://api.test.hotelbeds.com";
  }

  private headers(): Record<string, string> {
    const apiKey = env.HOTELBEDS_HOTEL_API_KEY;
    const secret = env.HOTELBEDS_HOTEL_SECRET;
    if (!apiKey || !secret) throw new NotConfiguredError("Hotelbeds");
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

  // ------------------------------------------------------------- Health

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        latencyMs: 0,
        message: "HOTELBEDS_HOTEL_API_KEY / HOTELBEDS_HOTEL_SECRET are not configured.",
      };
    }
    const { data, durationMs } = await this.get<Raw>("/hotel-api/1.0/status");
    const status = typeof data.status === "string" ? data.status : "OK";
    return {
      ok: true,
      latencyMs: durationMs,
      message: `Hotelbeds ${env.HOTELBEDS_ENVIRONMENT} API reachable (status: ${status}).`,
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

export const hotelbedsClient = new HotelbedsClient();
