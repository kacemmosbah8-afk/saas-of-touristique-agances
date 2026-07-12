import "server-only";

import { providerRequest } from "@/features/integrations/lib/http";
import type { DuffelCredentials } from "@/features/integrations/lib/credentials";
import type {
  AirlineDto,
  AirportDto,
  CreateOrderInput,
  FlightOfferDto,
  FlightOfferSearch,
  FlightOrderDto,
  HealthCheckResult,
} from "@/features/integrations/lib/dto";
import { DuffelMapper } from "@/features/integrations/providers/duffel/duffel-mapper";

const BASE_URL = "https://api.duffel.com";
const PROVIDER = "duffel";

/** Duffel imposes ~5 rps on test tokens; stay under it. */
const RATE_LIMIT = { limit: 4, windowMs: 1_000, maxWaitMs: 4_000 };

type DuffelList<T> = { data: T[]; meta?: { after?: string | null } };
type DuffelSingle<T> = { data: T };

/**
 * Duffel API client. Constructed per request with the caller's credentials —
 * it holds no ambient/env token, so each tenant's calls use that tenant's own
 * Duffel account.
 */
export class DuffelClient {
  private readonly mapper = new DuffelMapper();

  constructor(private readonly credentials: DuffelCredentials) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.credentials.token}`,
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

  /**
   * Creates a real order — "hold" reserves the fare without payment;
   * "instant" requires `input.payment` and debits it immediately. This is
   * the Supplier Order Execution Capability's only money-moving call.
   */
  async createOrder(input: CreateOrderInput): Promise<FlightOrderDto> {
    const payload = this.mapper.toCreateOrderPayload(input);
    const { data } = await this.post<DuffelSingle<Record<string, unknown>>>("/air/orders", {
      data: payload,
    });
    return this.mapper.toFlightOrderDto(data.data);
  }

  /**
   * Duffel's cancellation flow is two steps — request a cancellation quote,
   * then confirm it. This method does both, auto-confirming immediately
   * (no separate "review the cancellation fee" UI step in this first
   * implementation — see PROJECT.md gap analysis).
   */
  async cancelOrder(orderId: string): Promise<{ confirmed: boolean }> {
    const { data: quote } = await this.post<DuffelSingle<Record<string, unknown>>>(
      "/air/order_cancellations",
      { data: { order_id: orderId } },
    );
    const cancellationId = quote.data.id as string;
    await this.post<DuffelSingle<Record<string, unknown>>>(
      `/air/order_cancellations/${encodeURIComponent(cancellationId)}/actions/confirm`,
      {},
    );
    return { confirmed: true };
  }
}

export function createDuffelClient(credentials: DuffelCredentials): DuffelClient {
  return new DuffelClient(credentials);
}
