import "server-only";

import type { HealthCheckResult } from "@/features/integrations/lib/dto";
import type {
  ContentSyncDataset,
  ContentSyncProvider,
  SyncedCityDto,
  SyncedCountryDto,
  SyncedHotelDto,
} from "@/features/content-sync/lib/types";
import { TravelPayoutsClient } from "@/features/content-sync/providers/travelpayouts/travelpayouts-client";
import { TravelPayoutsMapper } from "@/features/content-sync/providers/travelpayouts/travelpayouts-mapper";

/**
 * Only countries/cities (and destinations, derived from cities — see
 * `lib/engine.ts`) are supported today. Hotels are not: TravelPayouts' only
 * hotel-content source (Hotellook) was permanently discontinued by the
 * vendor 2025-10-20, and TravelPayouts confirms no replacement hotel API is
 * offered to partners at this time (see `travelpayouts-client.ts`'s header
 * comment for the full evidence trail). This is a real, live-verified
 * capability gap, not a bug to "fix" — a future hotel-content provider
 * (Booking.com, Hotelbeds, Expedia) is a second, independent
 * `ContentSyncProvider` implementation that would declare `"hotels"` here.
 */
export const TRAVELPAYOUTS_SUPPORTED_DATASETS: readonly ContentSyncDataset[] = [
  "countries",
  "cities",
  "destinations",
];

/**
 * Adapts `TravelPayoutsClient` (raw HTTP + defensive mapping) to the
 * provider-agnostic `ContentSyncProvider` interface the sync engine
 * depends on. Countries/cities from the live Data API already carry stable
 * string codes (`code`/`country_code`) directly — unlike the old,
 * discontinued Hotellook static endpoints, no id→code cross-referencing is
 * needed for those two datasets.
 */
export class TravelPayoutsContentProvider implements ContentSyncProvider {
  readonly providerType = "TRAVELPAYOUTS" as const;
  readonly providerName = "TravelPayouts";
  readonly supportedDatasets = TRAVELPAYOUTS_SUPPORTED_DATASETS;

  private readonly mapper = new TravelPayoutsMapper();

  constructor(private readonly client: TravelPayoutsClient) {}

  async healthCheck(): Promise<HealthCheckResult> {
    return this.client.healthCheck();
  }

  async listCountries(): Promise<SyncedCountryDto[]> {
    const raw = await this.client.fetchCountries();
    const dtos: SyncedCountryDto[] = [];
    for (const entry of raw) {
      const dto = this.mapper.toCountryDto(entry);
      if (dto) dtos.push(dto);
    }
    return dtos;
  }

  async listCities(): Promise<SyncedCityDto[]> {
    const raw = await this.client.fetchCities();
    const dtos: SyncedCityDto[] = [];
    for (const entry of raw) {
      const dto = this.mapper.toCityDto(entry);
      if (dto) dtos.push(dto);
    }
    return dtos;
  }

  /**
   * Always returns `[]` without a network call — see
   * `TravelPayoutsClient.fetchHotelsForLocation`'s comment. `supportedDatasets`
   * excludes `"hotels"`, so `runContentSync` never calls this in the normal
   * run path; this only guards a caller that invokes it directly.
   */
  async listHotelsByCity(_cityCode: string): Promise<SyncedHotelDto[]> {
    return [];
  }
}

export function createTravelPayoutsContentProvider(
  client: TravelPayoutsClient,
): TravelPayoutsContentProvider {
  return new TravelPayoutsContentProvider(client);
}
