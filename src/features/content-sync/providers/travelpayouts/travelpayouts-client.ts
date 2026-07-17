import "server-only";

import { providerRequest } from "@/features/integrations/lib/http";
import type { TravelPayoutsCredentials } from "@/features/integrations/lib/credentials";
import type { HealthCheckResult } from "@/features/integrations/lib/dto";

const PROVIDER = "travelpayouts";

/**
 * Real-API-verified endpoints (see PROJECT.md §33.11 for the full
 * validation record). TravelPayouts' Hotellook hotel-content engine
 * (`engine.hotellook.com`, `yasen.hotellook.com` — countries/locations/
 * hotels/amenities static endpoints this client used before) was
 * **permanently discontinued by the vendor on 2025-10-20** ("Hotellook is
 * completely discontinuing as a brand" — TravelPayouts support FAQ). Every
 * one of those hosts now returns a blanket 404 for every path, confirmed
 * live. TravelPayouts' own support article states no replacement hotel-data
 * API is offered to partners at this time.
 *
 * What remains genuinely live is TravelPayouts' separate flight/reference
 * "Data API" (`api.travelpayouts.com/data/...`) — confirmed with a real
 * token on 2026-07-17: `data/en/countries.json` (253 records) and
 * `data/en/cities.json` (9,643 records) both return real, current data.
 * This client now sources countries/cities from there instead. There is
 * still no live hotel-content source — `fetchHotelsForLocation` reflects
 * that honestly (see its own comment) rather than guessing at a
 * since-decommissioned path.
 */
const BASE_URL = "https://api.travelpayouts.com";
const COUNTRIES_PATH = "/data/en/countries.json";
const CITIES_PATH = "/data/en/cities.json";

/**
 * Real measured behavior of `api.travelpayouts.com/data/*`: response
 * headers show `X-Rate-Limit: 15600` per `X-Rate-Limit-Reset: 300` (seconds)
 * — about 52 req/s sustained, and identical whether or not a token is sent
 * (this data is effectively public; the token is still sent for parity with
 * every other provider and in case that changes). Content sync is a
 * low-frequency background job, so this stays deliberately far under the
 * observed ceiling rather than chasing it.
 */
const RATE_LIMIT = { limit: 10, windowMs: 1_000, maxWaitMs: 5_000 };

type Raw = Record<string, unknown>;

/**
 * TravelPayouts content client. Constructed per tenant with that tenant's
 * own token — no ambient/env token used inside. Exposes only read-only
 * content endpoints; there is no booking/search-availability method on this
 * client by design, matching `ContentSyncProvider`'s scope.
 */
export class TravelPayoutsClient {
  constructor(private readonly credentials: TravelPayoutsCredentials) {}

  private async get<T>(path: string): Promise<T> {
    const res = await providerRequest<T>({
      provider: PROVIDER,
      method: "GET",
      url: `${BASE_URL}${path}`,
      // Documented auth method (X-Access-Token header or `token` query
      // param, either works) — header used so the token never lands in a
      // URL, query string, proxy log, or CDN cache key.
      headers: { "X-Access-Token": this.credentials.token },
      rateLimit: RATE_LIMIT,
      // Bulk static datasets can be large (cities.json is ~2MB); content
      // sync is not latency-sensitive.
      timeoutMs: 30_000,
    });
    return res.data;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const started = Date.now();
    const data = await this.get<unknown>(COUNTRIES_PATH);
    const count = Array.isArray(data) ? data.length : 0;
    return {
      ok: true,
      latencyMs: Date.now() - started,
      message: `TravelPayouts reachable (${count} countries in the reference catalogue).`,
    };
  }

  async fetchCountries(): Promise<Raw[]> {
    const data = await this.get<unknown>(COUNTRIES_PATH);
    return Array.isArray(data) ? (data as Raw[]) : [];
  }

  async fetchCities(): Promise<Raw[]> {
    const data = await this.get<unknown>(CITIES_PATH);
    return Array.isArray(data) ? (data as Raw[]) : [];
  }

  /**
   * There is no live hotel-content endpoint left to call — Hotellook (the
   * only TravelPayouts product that ever exposed one) was permanently shut
   * down 2025-10-20 and TravelPayouts offers no replacement (see this
   * file's header comment). Throwing here — rather than issuing a doomed
   * request to a host confirmed dead, or silently returning `[]` forever —
   * is a deliberate, informative failure: `TravelPayoutsContentProvider`
   * excludes `"hotels"` from `supportedDatasets`, so the sync engine never
   * calls this in the normal run path; this only fires if something calls
   * it directly, and should say exactly why rather than a generic network
   * error.
   */
  async fetchHotelsForLocation(_locationId: number): Promise<Raw[]> {
    throw new Error(
      "TravelPayouts has no live hotel-content endpoint: Hotellook (the only product that offered one) was " +
        "permanently discontinued by the vendor on 2025-10-20, and TravelPayouts offers no replacement hotel " +
        "API to partners at this time. Do not retry — this is not a transient failure.",
    );
  }
}

export function createTravelPayoutsClient(credentials: TravelPayoutsCredentials): TravelPayoutsClient {
  return new TravelPayoutsClient(credentials);
}
