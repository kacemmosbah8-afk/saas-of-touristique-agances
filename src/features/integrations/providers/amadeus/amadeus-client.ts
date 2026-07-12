import "server-only";

import { env } from "@/shared/config/env";
import {
  AuthenticationError,
  NotConfiguredError,
} from "@/features/integrations/lib/errors";
import { providerRequest } from "@/features/integrations/lib/http";
import type {
  AirportDto,
  FlightOfferDto,
  FlightOfferSearch,
  HealthCheckResult,
} from "@/features/integrations/lib/dto";
import { AmadeusMapper } from "@/features/integrations/providers/amadeus/amadeus-mapper";

const PROVIDER = "amadeus";
// Amadeus self-service test environment. Switch to production host when
// production credentials are issued.
const BASE_URL = "https://test.api.amadeus.com";

const RATE_LIMIT = { limit: 4, windowMs: 1_000, maxWaitMs: 4_000 };

type Raw = Record<string, unknown>;

/**
 * Amadeus self-service API client. Full OAuth2 client-credentials flow with
 * in-memory token caching. Every service throws NotConfiguredError until
 * AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET are provided — the UI shows the
 * provider as "Awaiting credentials".
 */
export class AmadeusClient {
  private readonly mapper = new AmadeusMapper();
  private token: { value: string; expiresAt: number } | null = null;

  isConfigured(): boolean {
    return !!env.AMADEUS_CLIENT_ID && !!env.AMADEUS_CLIENT_SECRET;
  }

  /** OAuth2 client_credentials grant, cached until 60s before expiry. */
  private async getAccessToken(): Promise<string> {
    if (!this.isConfigured()) throw new NotConfiguredError("Amadeus");
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.AMADEUS_CLIENT_ID!,
      client_secret: env.AMADEUS_CLIENT_SECRET!,
    });

    const res = await fetch(`${BASE_URL}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new AuthenticationError("Amadeus", res.status);
    }

    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) throw new AuthenticationError("Amadeus");

    this.token = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 1799) * 1000,
    };
    return this.token.value;
  }

  private async get<T>(path: string): Promise<{ data: T; durationMs: number }> {
    const token = await this.getAccessToken();
    const res = await providerRequest<T>({
      provider: PROVIDER,
      method: "GET",
      url: `${BASE_URL}${path}`,
      headers: { Authorization: `Bearer ${token}` },
      rateLimit: RATE_LIMIT,
      timeoutMs: 30_000,
    });
    return { data: res.data, durationMs: res.durationMs };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        latencyMs: 0,
        message: "Awaiting credentials — set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET.",
      };
    }
    const started = Date.now();
    await this.getAccessToken();
    return {
      ok: true,
      latencyMs: Date.now() - started,
      message: "Amadeus OAuth2 token issued successfully.",
    };
  }

  /** Airport & city lookup by keyword. */
  async searchLocations(query: string): Promise<AirportDto[]> {
    const { data } = await this.get<{ data?: Raw[] }>(
      `/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${encodeURIComponent(query)}&page%5Blimit%5D=20`,
    );
    return (data.data ?? []).map((loc) => this.mapper.toAirportDto(loc));
  }

  /** Flight offer search (GDS content). */
  async searchFlightOffers(search: FlightOfferSearch): Promise<FlightOfferDto[]> {
    const params = new URLSearchParams({
      originLocationCode: search.origin.toUpperCase(),
      destinationLocationCode: search.destination.toUpperCase(),
      departureDate: search.departureDate,
      adults: String(search.passengers.adults),
      travelClass: search.cabin.toUpperCase().replace("PREMIUM_ECONOMY", "PREMIUM_ECONOMY"),
      currencyCode: "USD",
      max: "20",
    });
    if (search.returnDate) params.set("returnDate", search.returnDate);
    if (search.passengers.children > 0) params.set("children", String(search.passengers.children));
    if (search.passengers.infants > 0) params.set("infants", String(search.passengers.infants));

    const { data } = await this.get<{ data?: Raw[]; dictionaries?: Raw }>(
      `/v2/shopping/flight-offers?${params.toString()}`,
    );
    return (data.data ?? []).map((offer) =>
      this.mapper.toFlightOfferDto(offer, data.dictionaries ?? {}),
    );
  }
}

export const amadeusClient = new AmadeusClient();
