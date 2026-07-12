import "server-only";
import type { ProviderType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { hotelbedsClient } from "@/features/integrations/providers/hotelbeds/hotelbeds-client";
import { duffelClient } from "@/features/integrations/providers/duffel/duffel-client";
import { starsFromCategoryCode } from "@/features/integrations/providers/hotelbeds/hotelbeds-mapper";
import type { SyncDataset } from "@/features/integrations/schemas/integration.schema";

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
const AIRPORT_PAGES = 3; // 3 × 200 airports per run
const AIRLINE_PAGES = 2;

export const SYNC_DATASET_PROVIDER: Record<SyncDataset, ProviderType> = {
  countries: "HOTELBEDS",
  destinations: "HOTELBEDS",
  hotels: "HOTELBEDS",
  amenities: "HOTELBEDS",
  airports: "DUFFEL",
  airlines: "DUFFEL",
};

async function syncCountries(db: TenantDb, tenantId: string): Promise<SyncOutcome> {
  const countries = await hotelbedsClient.listCountries();
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

async function syncDestinations(db: TenantDb, tenantId: string): Promise<SyncOutcome> {
  const { destinations } = await hotelbedsClient.listDestinations(1, 500);
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

async function syncAmenities(db: TenantDb, tenantId: string): Promise<SyncOutcome> {
  const facilities = await hotelbedsClient.listFacilities();
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
  destinationCode?: string,
): Promise<SyncOutcome> {
  const { hotels } = await hotelbedsClient.listHotels(1, HOTEL_IMPORT_BATCH, destinationCode);

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

async function syncAirports(db: TenantDb, tenantId: string): Promise<SyncOutcome> {
  let processed = 0;
  let after: string | undefined;

  for (let page = 0; page < AIRPORT_PAGES; page++) {
    const { airports, after: next } = await duffelClient.listAirports(200, after);
    for (const airport of airports) {
      if (!airport.iataCode) continue;
      await db.airport.upsert({
        where: { tenantId_iataCode: { tenantId, iataCode: airport.iataCode } },
        create: {
          tenantId,
          iataCode: airport.iataCode,
          name: airport.name,
          cityName: airport.cityName,
          countryCode: airport.countryCode,
          latitude: airport.latitude,
          longitude: airport.longitude,
          timeZone: airport.timeZone,
          source: "DUFFEL",
        },
        update: {
          name: airport.name,
          cityName: airport.cityName,
          countryCode: airport.countryCode,
          latitude: airport.latitude,
          longitude: airport.longitude,
          timeZone: airport.timeZone,
          source: "DUFFEL",
        },
      });
      processed++;
    }
    if (!next) break;
    after = next;
  }

  return { processed, detail: `${processed} airports imported (${AIRPORT_PAGES} pages max)` };
}

async function syncAirlines(db: TenantDb, tenantId: string): Promise<SyncOutcome> {
  let processed = 0;
  let after: string | undefined;

  for (let page = 0; page < AIRLINE_PAGES; page++) {
    const { airlines, after: next } = await duffelClient.listAirlines(200, after);
    for (const airline of airlines) {
      if (!airline.iataCode) continue;
      await db.airline.upsert({
        where: { tenantId_iataCode: { tenantId, iataCode: airline.iataCode } },
        create: {
          tenantId,
          iataCode: airline.iataCode,
          name: airline.name,
          logoUrl: airline.logoUrl,
          source: "DUFFEL",
        },
        update: { name: airline.name, logoUrl: airline.logoUrl, source: "DUFFEL" },
      });
      processed++;
    }
    if (!next) break;
    after = next;
  }

  return { processed, detail: `${processed} airlines imported (${AIRLINE_PAGES} pages max)` };
}

export async function runDatasetSync(
  db: TenantDb,
  tenantId: string,
  dataset: SyncDataset,
  destinationCode?: string,
): Promise<SyncOutcome> {
  switch (dataset) {
    case "countries":
      return syncCountries(db, tenantId);
    case "destinations":
      return syncDestinations(db, tenantId);
    case "amenities":
      return syncAmenities(db, tenantId);
    case "hotels":
      return syncHotels(db, tenantId, destinationCode);
    case "airports":
      return syncAirports(db, tenantId);
    case "airlines":
      return syncAirlines(db, tenantId);
  }
}
