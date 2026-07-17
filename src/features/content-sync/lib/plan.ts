import type { ProviderType } from "@prisma/client";

import type {
  SyncedCityDto,
  SyncedCountryDto,
  SyncedHotelDto,
} from "@/features/content-sync/lib/types";

/**
 * Pure upsert decisions — no I/O, no Prisma, no Date.now(). The engine
 * (`lib/engine.ts`) is the only caller and the only place these decisions
 * turn into writes. Mirrors the split `reconciliation-plan.ts` established
 * for the (now-deprecated) Booking Status Resolution Capability: keep the
 * "what should happen" decision testable in isolation from the database.
 *
 * "skip" exists specifically to avoid an unconditional write (and the
 * `updatedAt` churn that comes with it) on every sync run when nothing
 * about a record actually changed — most runs, most records are unchanged.
 */
export type UpsertPlan<TCreate, TUpdate> =
  | { action: "create"; data: TCreate }
  | { action: "update"; data: TUpdate }
  | { action: "skip" };

export function planCountryUpsert(
  existing: { name: string } | null,
  incoming: SyncedCountryDto,
  source: ProviderType,
): UpsertPlan<{ code: string; name: string; source: ProviderType }, { name: string }> {
  if (!existing) {
    return { action: "create", data: { code: incoming.code, name: incoming.name, source } };
  }
  if (existing.name === incoming.name) return { action: "skip" };
  return { action: "update", data: { name: incoming.name } };
}

export function planCityUpsert(
  existing: { name: string; countryCode: string | null } | null,
  incoming: SyncedCityDto,
  source: ProviderType,
): UpsertPlan<
  { code: string; name: string; countryCode: string | null; source: ProviderType },
  { name: string; countryCode: string | null }
> {
  if (!existing) {
    return {
      action: "create",
      data: { code: incoming.code, name: incoming.name, countryCode: incoming.countryCode, source },
    };
  }
  if (existing.name === incoming.name && existing.countryCode === incoming.countryCode) {
    return { action: "skip" };
  }
  return { action: "update", data: { name: incoming.name, countryCode: incoming.countryCode } };
}

export type HotelScalarFields = {
  name: string;
  stars: number | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  address: string | null;
  website: string | null;
  amenities: string[];
};

function hotelScalarsEqual(a: HotelScalarFields, b: HotelScalarFields): boolean {
  return (
    a.name === b.name &&
    a.stars === b.stars &&
    a.city === b.city &&
    a.country === b.country &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.description === b.description &&
    a.address === b.address &&
    a.website === b.website &&
    a.amenities.length === b.amenities.length &&
    a.amenities.every((v, i) => v === b.amenities[i])
  );
}

function hotelScalarsFromDto(dto: SyncedHotelDto): HotelScalarFields {
  return {
    name: dto.name,
    stars: dto.stars,
    city: dto.city,
    country: dto.country,
    latitude: dto.latitude,
    longitude: dto.longitude,
    description: dto.description,
    address: dto.address,
    website: dto.website,
    amenities: dto.amenities,
  };
}

export function planHotelUpsert(
  existing: HotelScalarFields | null,
  incoming: SyncedHotelDto,
  source: ProviderType,
): UpsertPlan<
  HotelScalarFields & { externalCode: string; source: ProviderType },
  HotelScalarFields
> {
  const incomingScalars = hotelScalarsFromDto(incoming);
  if (!existing) {
    return { action: "create", data: { ...incomingScalars, externalCode: incoming.code, source } };
  }
  if (hotelScalarsEqual(existing, incomingScalars)) return { action: "skip" };
  return { action: "update", data: incomingScalars };
}

export type DestinationScalarFields = {
  name: string;
  country: string;
  city: string | null;
};

export function planDestinationUpsert(
  existing: DestinationScalarFields | null,
  incoming: { code: string; name: string; country: string; city: string | null },
  source: ProviderType,
): UpsertPlan<
  DestinationScalarFields & { externalCode: string; source: ProviderType },
  DestinationScalarFields
> {
  const incomingScalars: DestinationScalarFields = {
    name: incoming.name,
    country: incoming.country,
    city: incoming.city,
  };
  if (!existing) {
    return { action: "create", data: { ...incomingScalars, externalCode: incoming.code, source } };
  }
  if (existing.name === incomingScalars.name && existing.country === incomingScalars.country && existing.city === incomingScalars.city) {
    return { action: "skip" };
  }
  return { action: "update", data: incomingScalars };
}
