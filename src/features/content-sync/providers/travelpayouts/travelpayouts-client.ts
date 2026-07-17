import "server-only";

import { providerRequest } from "@/features/integrations/lib/http";
import type { TravelPayoutsCredentials } from "@/features/integrations/lib/credentials";
import type { HealthCheckResult } from "@/features/integrations/lib/dto";

const PROVIDER = "travelpayouts";

/**
 * Static content endpoints, kept as named constants in one place rather
 * than scattered through the client — the exact paths below are TravelOS's
 * best-grounded read of TravelPayouts/Hotellook's public content API
 * (cross-referenced against multiple third-party client implementations
 * since the official docs 403'd every automated fetch attempted while
 * building this). Treat this block as the single place to correct a path
 * if a live token reveals a different one — nothing else in this client
 * or the mapper needs to change.
 */
const BASE_URL = "https://engine.hotellook.com";
const COUNTRIES_PATH = "/api/v2/static/countries.json";
const LOCATIONS_PATH = "/api/v2/static/locations.json";
/** Requires a numeric `locationId` (the id from LOCATIONS_PATH, not its code). */
const HOTELS_PATH = "/static/hotels.json";

/** TravelPayouts' documented low-volume batch/content quota — conservative. */
const RATE_LIMIT = { limit: 5, windowMs: 1_000, maxWaitMs: 5_000 };

type Raw = Record<string, unknown>;

/**
 * TravelPayouts (Hotellook engine) content client. Constructed per tenant
 * with that tenant's own token — no ambient/env token used inside. Exposes
 * only read-only content endpoints; there is no booking/search-availability
 * method on this client by design, matching `ContentSyncProvider`'s scope.
 */
export class TravelPayoutsClient {
  constructor(private readonly credentials: TravelPayoutsCredentials) {}

  private async get<T>(path: string, params: Record<string, string | number>): Promise<T> {
    const query = new URLSearchParams({
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      token: this.credentials.token,
    });
    const res = await providerRequest<T>({
      provider: PROVIDER,
      method: "GET",
      url: `${BASE_URL}${path}?${query.toString()}`,
      rateLimit: RATE_LIMIT,
      // Bulk static datasets can be large; content sync is not latency-sensitive.
      timeoutMs: 30_000,
    });
    return res.data;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const started = Date.now();
    const data = await this.get<unknown>(COUNTRIES_PATH, {});
    const count = Array.isArray(data) ? data.length : 0;
    return {
      ok: true,
      latencyMs: Date.now() - started,
      message: `TravelPayouts reachable (${count} countries in the static catalogue).`,
    };
  }

  async fetchCountries(): Promise<Raw[]> {
    const data = await this.get<unknown>(COUNTRIES_PATH, {});
    return Array.isArray(data) ? (data as Raw[]) : [];
  }

  async fetchLocations(): Promise<Raw[]> {
    const data = await this.get<unknown>(LOCATIONS_PATH, {});
    return Array.isArray(data) ? (data as Raw[]) : [];
  }

  /** `locationId` is the numeric city id from `fetchLocations()`, not its code. */
  async fetchHotelsForLocation(locationId: number): Promise<Raw[]> {
    const data = await this.get<unknown>(HOTELS_PATH, { locationId });
    if (Array.isArray(data)) return data as Raw[];
    // Some TravelPayouts static endpoints wrap the array under a key
    // (`{ hotels: [...] }`) rather than returning it bare — tolerate both.
    if (data && typeof data === "object" && Array.isArray((data as Raw).hotels)) {
      return (data as Raw).hotels as Raw[];
    }
    return [];
  }
}

export function createTravelPayoutsClient(credentials: TravelPayoutsCredentials): TravelPayoutsClient {
  return new TravelPayoutsClient(credentials);
}
