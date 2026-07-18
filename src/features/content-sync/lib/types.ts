import type { ProviderType } from "@prisma/client";

import type { HealthCheckResult } from "@/features/integrations/lib/dto";

/**
 * The content-only datasets TravelOS synchronizes. Kept as a fixed, small
 * enum (not "whatever the provider happens to expose") so the engine, the
 * settings UI, and every provider implementation agree on the same set of
 * things that can be turned on/off independently.
 */
export const CONTENT_SYNC_DATASETS = ["countries", "cities", "destinations", "hotels"] as const;
export type ContentSyncDataset = (typeof CONTENT_SYNC_DATASETS)[number];

export type SyncedCountryDto = {
  /** Stable code from the provider — the natural dedup key (Country.code). */
  code: string;
  name: string;
};

export type SyncedCityDto = {
  /** Stable code from the provider — the natural dedup key (City.code). */
  code: string;
  name: string;
  countryCode: string | null;
};

export type SyncedImageDto = {
  url: string;
  alt?: string | null;
};

/**
 * A hotel as returned by any content provider, already normalized. Richer
 * than the live-search DTOs in `integrations/lib/dto.ts` on purpose — this
 * is a *content* record (persisted, browsable), not a *search result*, so
 * it always carries whatever description/facility/image data the provider
 * offers instead of splitting summary vs. detail across two calls.
 */
export type SyncedHotelDto = {
  /** Stable code from the provider — the dedup key alongside `source`. */
  code: string;
  name: string;
  stars: number | null;
  countryCode: string | null;
  cityCode: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  address: string | null;
  website: string | null;
  /** Free-text facility/amenity names — maps onto Hotel.amenities. */
  amenities: string[];
  images: SyncedImageDto[];
};

/**
 * The provider-agnostic contract every content source implements —
 * mirrors `SupplierExecutionProvider`/`JobHandler` in
 * this codebase exactly: one small interface, the sync engine
 * (`lib/engine.ts`) depends only on this, never on a concrete client.
 * TravelPayouts is the first (and today, only) implementation; a future
 * Booking.com, Hotelbeds, or Expedia *content* connector is a second
 * implementation of this same interface, not a change to the engine, the
 * job handler, the schema, or any call site's shape — see PROJECT.md,
 * "TravelPayouts Content Synchronization Engine".
 *
 * Deliberately does NOT expose search/availability/booking methods — a
 * content provider only ever answers "what exists," never "is it
 * available" or "book it." That split is the architectural boundary this
 * interface exists to enforce.
 */
export interface ContentSyncProvider {
  readonly providerType: ProviderType;
  readonly providerName: string;

  /**
   * Which datasets this provider can actually supply today — not every
   * provider offers every dataset (TravelPayouts, for one, lost its only
   * hotel-content source when Hotellook was discontinued; see
   * `providers/travelpayouts/travelpayouts-client.ts`). The engine
   * (`lib/engine.ts`) skips a requested-but-unsupported dataset with one
   * clear, informational note instead of attempting calls known in advance
   * to fail — this is a capability declaration, not an error condition.
   */
  readonly supportedDatasets: readonly ContentSyncDataset[];

  healthCheck(): Promise<HealthCheckResult>;

  /** Every country the provider has content for. Expected to be a small, single-page list. */
  listCountries(): Promise<SyncedCountryDto[]>;

  /** Every city the provider has content for, optionally scoped to one country. */
  listCities(countryCode?: string): Promise<SyncedCityDto[]>;

  /**
   * Hotels for one city. Content providers generally require scoping hotel
   * listing by location (there is no "list every hotel on earth" call) —
   * the sync engine drives this by iterating the cities dataset.
   */
  listHotelsByCity(cityCode: string): Promise<SyncedHotelDto[]>;
}
