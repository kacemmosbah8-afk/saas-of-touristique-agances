import "server-only";

import type { HealthCheckResult } from "@/features/integrations/lib/dto";
import type {
  ContentSyncProvider,
  SyncedCityDto,
  SyncedCountryDto,
  SyncedHotelDto,
} from "@/features/content-sync/lib/types";
import { TravelPayoutsClient } from "@/features/content-sync/providers/travelpayouts/travelpayouts-client";
import { TravelPayoutsMapper } from "@/features/content-sync/providers/travelpayouts/travelpayouts-mapper";

/**
 * Adapts `TravelPayoutsClient` (raw HTTP + defensive mapping) to the
 * provider-agnostic `ContentSyncProvider` interface the sync engine
 * depends on. This is the only place TravelPayouts-specific cross-
 * referencing lives: the raw API returns cities keyed to a numeric
 * `countryId` and hotels keyed to a numeric `cityId`, but TravelOS's
 * `ContentSyncProvider` contract deals only in stable string codes — so
 * this adapter resolves id → code once per sync run and caches it for its
 * own lifetime (one instance per job invocation, never shared across
 * tenants or runs).
 */
export class TravelPayoutsContentProvider implements ContentSyncProvider {
  readonly providerType = "TRAVELPAYOUTS" as const;
  readonly providerName = "TravelPayouts";

  private readonly mapper = new TravelPayoutsMapper();
  private countryCodeById: Map<string, string> | null = null;
  private cityCodeById: Map<string, string> | null = null;
  private cityIdByCode: Map<string, number> | null = null;

  constructor(private readonly client: TravelPayoutsClient) {}

  async healthCheck(): Promise<HealthCheckResult> {
    return this.client.healthCheck();
  }

  async listCountries(): Promise<SyncedCountryDto[]> {
    const raw = await this.client.fetchCountries();
    const dtos: SyncedCountryDto[] = [];
    const codeById = new Map<string, string>();

    for (const entry of raw) {
      const dto = this.mapper.toCountryDto(entry);
      if (!dto) continue;
      dtos.push(dto);
      const id = typeof entry.id === "string" || typeof entry.id === "number" ? String(entry.id) : null;
      if (id) codeById.set(id, dto.code);
    }

    this.countryCodeById = codeById;
    return dtos;
  }

  async listCities(): Promise<SyncedCityDto[]> {
    const countryCodeById = this.countryCodeById ?? (await this.buildCountryIndex());
    const raw = await this.client.fetchLocations();
    const dtos: SyncedCityDto[] = [];
    const codeById = new Map<string, string>();
    const idByCode = new Map<string, number>();

    for (const entry of raw) {
      const dto = this.mapper.toCityDto(entry, countryCodeById);
      if (!dto) continue;
      dtos.push(dto);
      const id = typeof entry.id === "string" || typeof entry.id === "number" ? String(entry.id) : null;
      if (id) {
        codeById.set(id, dto.code);
        const numericId = Number(id);
        if (Number.isFinite(numericId)) idByCode.set(dto.code, numericId);
      }
    }

    this.cityCodeById = codeById;
    this.cityIdByCode = idByCode;
    return dtos;
  }

  async listHotelsByCity(cityCode: string): Promise<SyncedHotelDto[]> {
    const cityIdByCode = this.cityIdByCode ?? (await this.buildCityIndex());
    const locationId = cityIdByCode.get(cityCode);
    if (locationId === undefined) return [];

    const raw = await this.client.fetchHotelsForLocation(locationId);
    const cityCodeById = this.cityCodeById ?? new Map<string, string>();
    const dtos: SyncedHotelDto[] = [];
    for (const entry of raw) {
      const dto = this.mapper.toHotelDto(entry, cityCodeById, cityCode);
      if (dto) dtos.push(dto);
    }
    return dtos;
  }

  private async buildCountryIndex(): Promise<Map<string, string>> {
    await this.listCountries();
    return this.countryCodeById ?? new Map();
  }

  private async buildCityIndex(): Promise<Map<string, number>> {
    await this.listCities();
    return this.cityIdByCode ?? new Map();
  }
}

export function createTravelPayoutsContentProvider(
  client: TravelPayoutsClient,
): TravelPayoutsContentProvider {
  return new TravelPayoutsContentProvider(client);
}
