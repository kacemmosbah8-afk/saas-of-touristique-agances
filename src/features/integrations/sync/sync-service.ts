import "server-only";
import type { ProviderType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import type { HotelbedsClient } from "@/features/integrations/providers/hotelbeds/hotelbeds-client";
import { starsFromCategoryCode } from "@/features/integrations/providers/hotelbeds/hotelbeds-mapper";
import type { SyncDataset } from "@/features/integrations/schemas/integration.schema";

/**
 * Sync runs against the tenant's own provider clients — resolved by the sync
 * action from that tenant's encrypted credentials and passed in here. This
 * module never constructs a client from ambient/env credentials.
 */
export type SyncClients = {
  hotelbeds?: HotelbedsClient;
};

/**
 * Dataset importers. Each pulls a bounded batch from the provider, maps it
 * through the DTO layer, and upserts into TravelOS reference models keyed by
 * [tenantId, code]. Re-running a sync refreshes names in place — imports are
 * idempotent. Batch caps keep a manual sync inside one request budget; the
 * ProviderSync row records exactly how much was processed.
 */

export type SyncOutcome = {
  processed: number;
  detail: string;
};

const HOTEL_IMPORT_BATCH = 50;

export const SYNC_DATASET_PROVIDER: Record<SyncDataset, ProviderType> = {
  countries: "HOTELBEDS",
  destinations: "HOTELBEDS",
  hotels: "HOTELBEDS",
  amenities: "HOTELBEDS",
};

async function syncCountries(
  db: TenantDb,
  tenantId: string,
  hotelbeds: HotelbedsClient,
): Promise<SyncOutcome> {
  const countries = await hotelbeds.listCountries();
  for (const country of countries) {
    if (!country.code) continue;
    await db.country.upsert({
      where: { tenantId_code: { tenantId, code: country.code } },
      create: { tenantId, code: country.code, name: country.name, source: "HOTELBEDS" },
      update: { name: country.name, source: "HOTELBEDS" },
    });
  }
  return { processed: countries.length, detail: `${countries.length} countries imported` };
}

async function syncDestinations(
  db: TenantDb,
  tenantId: string,
  hotelbeds: HotelbedsClient,
): Promise<SyncOutcome> {
  const { destinations } = await hotelbeds.listDestinations(1, 500);
  for (const destination of destinations) {
    if (!destination.code) continue;
    await db.city.upsert({
      where: { tenantId_code: { tenantId, code: destination.code } },
      create: {
        tenantId,
        code: destination.code,
        name: destination.name,
        countryCode: destination.countryCode,
        source: "HOTELBEDS",
      },
      update: {
        name: destination.name,
        countryCode: destination.countryCode,
        source: "HOTELBEDS",
      },
    });
  }
  return {
    processed: destinations.length,
    detail: `${destinations.length} destinations imported as cities`,
  };
}

async function syncAmenities(
  db: TenantDb,
  tenantId: string,
  hotelbeds: HotelbedsClient,
): Promise<SyncOutcome> {
  const facilities = await hotelbeds.listFacilities();
  for (const facility of facilities) {
    await db.amenity.upsert({
      where: { tenantId_code: { tenantId, code: facility.code } },
      create: { tenantId, code: facility.code, name: facility.name, source: "HOTELBEDS" },
      update: { name: facility.name, source: "HOTELBEDS" },
    });
  }
  return { processed: facilities.length, detail: `${facilities.length} amenities imported` };
}

async function syncHotels(
  db: TenantDb,
  tenantId: string,
  hotelbeds: HotelbedsClient,
  destinationCode?: string,
): Promise<SyncOutcome> {
  const { hotels } = await hotelbeds.listHotels(1, HOTEL_IMPORT_BATCH, destinationCode);

  let processed = 0;
  for (const hotel of hotels) {
    if (!hotel.code) continue;
    const existing = await db.hotel.findFirst({
      where: { source: "HOTELBEDS", externalCode: hotel.code },
      select: { id: true },
    });

    const data = {
      name: hotel.name,
      stars: hotel.stars ?? starsFromCategoryCode(hotel.categoryName),
      city: hotel.city,
      country: hotel.countryCode,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      coverImageUrl: hotel.thumbnailUrl,
      source: "HOTELBEDS" as const,
      externalCode: hotel.code,
    };

    if (existing) {
      await db.hotel.update({ where: { id: existing.id, tenantId }, data });
    } else {
      await db.hotel.create({ data: { tenantId, ...data } });
    }
    processed++;
  }

  return {
    processed,
    detail: `${processed} hotels imported${destinationCode ? ` for ${destinationCode}` : ""} (batch of ${HOTEL_IMPORT_BATCH})`,
  };
}

export async function runDatasetSync(
  db: TenantDb,
  tenantId: string,
  dataset: SyncDataset,
  clients: SyncClients,
  destinationCode?: string,
): Promise<SyncOutcome> {
  const requireHotelbeds = () => {
    if (!clients.hotelbeds) throw new Error("Hotelbeds client not resolved for this tenant.");
    return clients.hotelbeds;
  };

  switch (dataset) {
    case "countries":
      return syncCountries(db, tenantId, requireHotelbeds());
    case "destinations":
      return syncDestinations(db, tenantId, requireHotelbeds());
    case "amenities":
      return syncAmenities(db, tenantId, requireHotelbeds());
    case "hotels":
      return syncHotels(db, tenantId, requireHotelbeds(), destinationCode);
  }
}
