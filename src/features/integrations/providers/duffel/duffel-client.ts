import "server-only";

import { env } from "@/shared/config/env";
import { NotConfiguredError } from "@/features/integrations/lib/errors";
import { providerRequest } from "@/features/integrations/lib/http";
import type {
  AirlineDto,
  AirportDto,
  FlightOfferDto,
  FlightOfferSearch,
  HealthCheckResult,
} from "@/features/integrations/lib/dto";
import { DuffelMapper } from "@/features/integrations/providers/duffel/duffel-mapper";

const BASE_URL = "https://api.duffel.com";
const PROVIDER = "duffel";

/** Duffel imposes ~5 rps on test tokens; stay under it. */
const RATE_LIMIT = { limit: 4, windowMs: 1_000, maxWaitMs: 4_000 };

type DuffelList<T> = { data: T[]; meta?: { after?: string | null } };
type DuffelSingle<T> = { data: T };

export class DuffelClient {
  private readonly mapper = new DuffelMapper();

  isConfigured(): boolean {
    return !!env.DUFFEL_TOKEN;
  }

  private headers(): Record<string, string> {
    if (!env.DUFFEL_TOKEN) throw new NotConfiguredError("Duffel");
    return {
      Authorization: `Bearer ${env.DUFFEL_TOKEN}`,
      "Duffel-Version": "v2",
    };
  }

  private async get<T>(path: string): Promise<{ data: T; durationMs: number }> {
    const res = await providerRequest<T>({
      provider: PROVIDER,
      method: "GET",
      url: `${BASE_URL}${path}`,
      headers: this.headers(),
      rateLimit: RATE_LIMIT,
    });
    return { data: res.data, durationMs: res.durationMs };
  }

  private async post<T>(path: string, body: unknown): Promise<{ data: T; durationMs: number }> {
    const res = await providerRequest<T>({
      provider: PROVIDER,
      method: "POST",
      url: `${BASE_URL}${path}`,
      headers: this.headers(),
      body,
      timeoutMs: 30_000,
      rateLimit: RATE_LIMIT,
    });
    return { data: res.data, durationMs: res.durationMs };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.isConfigured()) {
      return { ok: false, latencyMs: 0, message: "DUFFEL_TOKEN is not configured." };
    }
    const { durationMs } = await this.get<DuffelList<unknown>>("/air/airlines?limit=1");
    return {
      ok: true,
      latencyMs: durationMs,
      message: "Duffel API reachable and token accepted.",
    };
  }

  /** Airport/city suggestions matching a free-text query. */
  async searchAirports(query: string): Promise<AirportDto[]> {
    const { data } = await this.get<DuffelList<Record<string, unknown>>>(
      `/places/suggestions?query=${encodeURIComponent(query)}`,
    );
    return data.data
      .filter((p) => p.type === "airport")
      .map((p) => this.mapper.toAirportDto(p));
  }

  /** Paginated airport catalogue (for sync). Returns items + next cursor. */
  async listAirports(limit = 200, after?: string): Promise<{ airports: AirportDto[]; after: string | null }> {
    const cursor = after ? `&after=${encodeURIComponent(after)}` : "";
    const { data } = await this.get<DuffelList<Record<string, unknown>>>(
      `/air/airports?limit=${limit}${cursor}`,
    );
    return {
      airports: data.data.map((a) => this.mapper.toAirportDto(a)),
      after: data.meta?.after ?? null,
    };
  }

  async listAirlines(limit = 200, after?: string): Promise<{ airlines: AirlineDto[]; after: string | null }> {
    const cursor = after ? `&after=${encodeURIComponent(after)}` : "";
    const { data } = await this.get<DuffelList<Record<string, unknown>>>(
      `/air/airlines?limit=${limit}${cursor}`,
    );
    return {
      airlines: data.data.map((a) => this.mapper.toAirlineDto(a)),
      after: data.meta?.after ?? null,
    };
  }

  /**
   * Search flight offers. Creates an offer request with return_offers=true so
   * offers come back inline in a single round trip.
   */
  async searchOffers(search: FlightOfferSearch): Promise<FlightOfferDto[]> {
    const slices: Record<string, string>[] = [
      {
        origin: search.origin.toUpperCase(),
        destination: search.destination.toUpperCase(),
        departure_date: search.departureDate,
      },
    ];
    if (search.returnDate) {
      slices.push({
        origin: search.destination.toUpperCase(),
        destination: search.origin.toUpperCase(),
        departure_date: search.returnDate,
      });
    }

    const passengers = [
      ...Array.from({ length: search.passengers.adults }, () => ({ type: "adult" })),
      ...Array.from({ length: search.passengers.children }, () => ({ age: 10 })),
      ...Array.from({ length: search.passengers.infants }, () => ({ age: 1 })),
    ];

    const { data } = await this.post<DuffelSingle<{ offers?: Record<string, unknown>[] }>>(
      "/air/offer_requests?return_offers=true&supplier_timeout=20000",
      { data: { slices, passengers, cabin_class: search.cabin } },
    );

    const offers = data.data.offers ?? [];
    return offers.slice(0, 30).map((o) => this.mapper.toOfferDto(o));
  }

  async getOffer(offerId: string): Promise<FlightOfferDto> {
    const { data } = await this.get<DuffelSingle<Record<string, unknown>>>(
      `/air/offers/${encodeURIComponent(offerId)}`,
    );
    return this.mapper.toOfferDto(data.data);
  }
}

export const duffelClient = new DuffelClient();
