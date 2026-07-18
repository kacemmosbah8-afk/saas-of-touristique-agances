import "server-only";
import type { ProviderType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { ensureProviderRecord, recordProviderCall } from "@/features/integrations/lib/provider-record";
import { asIntegrationError } from "@/features/integrations/lib/errors";
import type { ContentSyncDataset, ContentSyncProvider } from "@/features/content-sync/lib/types";
import { CONTENT_SYNC_DATASETS } from "@/features/content-sync/lib/types";
import {
  planCityUpsert,
  planCountryUpsert,
  planDestinationUpsert,
  planHotelUpsert,
} from "@/features/content-sync/lib/plan";

export type ContentSyncOptions = {
  /** Defaults to every dataset. */
  datasets?: ContentSyncDataset[];
  /** How many cities' hotel listings to pull in one run — bounds one job's request volume. */
  maxCitiesPerRun?: number;
  /** Resume point from the previous run's `nextCursorCityCode` — null/absent starts from the top. */
  cursorCityCode?: string | null;
};

export type ContentSyncSummary = {
  status: "SUCCESS" | "FAILED";
  processed: { countries: number; cities: number; destinations: number; hotels: number };
  /** Safe-to-log summaries of per-record failures — never raw payloads or credentials. */
  errors: string[];
  /**
   * Datasets that were requested but the provider doesn't support (e.g.
   * TravelPayouts + "hotels" since Hotellook's shutdown) — distinct from
   * `errors`: this is an expected capability gap, not a failure, so it
   * never counts against run status or gets retried.
   */
  skipped: { dataset: ContentSyncDataset; reason: string }[];
  /** Where the next run's hotel sync should resume — null means "start over from the top". */
  nextCursorCityCode: string | null;
};

const DEFAULT_MAX_CITIES_PER_RUN = 25;

/**
 * The provider-agnostic sync engine — depends only on `ContentSyncProvider`,
 * never a concrete client, so adding a second content source later is
 * additive. Runs each requested dataset, upserts through the pure
 * `plan*Upsert` decisions in `lib/plan.ts`, and degrades gracefully: one bad
 * record never aborts a dataset, one failed dataset never aborts the run.
 */
export async function runContentSync(
  db: TenantDb,
  tenantId: string,
  provider: ContentSyncProvider,
  options: ContentSyncOptions = {},
): Promise<ContentSyncSummary> {
  const requestedDatasets = options.datasets ?? [...CONTENT_SYNC_DATASETS];
  const skipped: { dataset: ContentSyncDataset; reason: string }[] = [];
  const datasets = requestedDatasets.filter((d) => {
    if (provider.supportedDatasets.includes(d)) return true;
    skipped.push({
      dataset: d,
      reason: `${provider.providerName} does not currently support "${d}" content.`,
    });
    return false;
  });
  const maxCities = options.maxCitiesPerRun ?? DEFAULT_MAX_CITIES_PER_RUN;

  if (skipped.length > 0) {
    logger.info("content-sync: skipping unsupported datasets", {
      tenantId,
      provider: provider.providerType,
      skipped: skipped.map((s) => s.dataset),
    });
  }

  const providerId = await ensureProviderRecord(db, tenantId, provider.providerType);
  const syncRow = await db.providerSync.create({
    data: { tenantId, providerId, status: "RUNNING" },
    select: { id: true },
  });

  const processed = { countries: 0, cities: 0, destinations: 0, hotels: 0 };
  const errors: string[] = [];
  let nextCursorCityCode: string | null = null;

  // Countries and cities are cheap, single-page pulls — always run together
  // so cities (which need country codes) and destinations (which need city
  // names) have what they need, regardless of which datasets were asked for.
  const countryNameByCode = new Map<string, string>();
  let cityDtos: Awaited<ReturnType<ContentSyncProvider["listCities"]>> = [];

  if (datasets.includes("countries") || datasets.includes("cities") || datasets.includes("hotels")) {
    try {
      const started = Date.now();
      const countries = await provider.listCountries();
      await recordProviderCall(db, tenantId, providerId, {
        operation: "listCountries",
        ok: true,
        durationMs: Date.now() - started,
      });

      for (const dto of countries) {
        countryNameByCode.set(dto.code, dto.name);
        if (!datasets.includes("countries")) continue;
        try {
          const existing = await db.country.findUnique({
            where: { tenantId_code: { tenantId, code: dto.code } },
            select: { name: true },
          });
          const plan = planCountryUpsert(existing, dto, provider.providerType);
          if (plan.action === "create") {
            await db.country.create({ data: { tenantId, ...plan.data } });
          } else if (plan.action === "update") {
            await db.country.update({
              where: { tenantId_code: { tenantId, code: dto.code } },
              data: plan.data,
            });
          }
          if (plan.action !== "skip") processed.countries++;
        } catch (err) {
          errors.push(`country ${dto.code}: ${errorMessage(err)}`);
        }
      }
    } catch (err) {
      const message = `countries dataset: ${errorMessage(err)}`;
      errors.push(message);
      await recordProviderCall(db, tenantId, providerId, {
        operation: "listCountries",
        ok: false,
        durationMs: 0,
        detail: errorMessage(err),
      });
    }
  }

  if (datasets.includes("cities") || datasets.includes("hotels") || datasets.includes("destinations")) {
    try {
      const started = Date.now();
      cityDtos = await provider.listCities();
      await recordProviderCall(db, tenantId, providerId, {
        operation: "listCities",
        ok: true,
        durationMs: Date.now() - started,
      });

      for (const dto of cityDtos) {
        if (!datasets.includes("cities")) continue;
        try {
          const existing = await db.city.findUnique({
            where: { tenantId_code: { tenantId, code: dto.code } },
            select: { name: true, countryCode: true },
          });
          const plan = planCityUpsert(existing, dto, provider.providerType);
          if (plan.action === "create") {
            await db.city.create({ data: { tenantId, ...plan.data } });
          } else if (plan.action === "update") {
            await db.city.update({
              where: { tenantId_code: { tenantId, code: dto.code } },
              data: plan.data,
            });
          }
          if (plan.action !== "skip") processed.cities++;
        } catch (err) {
          errors.push(`city ${dto.code}: ${errorMessage(err)}`);
        }
      }
    } catch (err) {
      const message = `cities dataset: ${errorMessage(err)}`;
      errors.push(message);
      await recordProviderCall(db, tenantId, providerId, {
        operation: "listCities",
        ok: false,
        durationMs: 0,
        detail: errorMessage(err),
      });
    }
  }

  if (datasets.includes("destinations")) {
    for (const city of cityDtos) {
      try {
        const country = city.countryCode ? (countryNameByCode.get(city.countryCode) ?? city.countryCode) : "";
        const incoming = { code: city.code, name: city.name, country, city: city.name };
        const existing = await db.destination.findFirst({
          where: { tenantId, source: provider.providerType, externalCode: city.code },
          select: { name: true, country: true, city: true },
        });
        const plan = planDestinationUpsert(existing, incoming, provider.providerType);
        if (plan.action === "create") {
          await db.destination.create({ data: { tenantId, ...plan.data } });
        } else if (plan.action === "update") {
          const row = await db.destination.findFirst({
            where: { tenantId, source: provider.providerType, externalCode: city.code },
            select: { id: true },
          });
          if (row) await db.destination.update({ where: { id: row.id, tenantId }, data: plan.data });
        }
        if (plan.action !== "skip") processed.destinations++;
      } catch (err) {
        errors.push(`destination ${city.code}: ${errorMessage(err)}`);
      }
    }
  }

  if (datasets.includes("hotels") && cityDtos.length > 0) {
    const startIndex = options.cursorCityCode
      ? Math.max(0, cityDtos.findIndex((c) => c.code === options.cursorCityCode) + 1)
      : 0;
    const window = cityDtos.slice(startIndex, startIndex + maxCities);
    // Wrapped around to the top (fewer cities remained than maxCities) — next run starts over.
    nextCursorCityCode =
      window.length > 0 && startIndex + window.length < cityDtos.length
        ? window[window.length - 1].code
        : null;

    for (const city of window) {
      try {
        const started = Date.now();
        const hotels = await provider.listHotelsByCity(city.code);
        await recordProviderCall(db, tenantId, providerId, {
          operation: `listHotelsByCity(${city.code})`,
          ok: true,
          durationMs: Date.now() - started,
        });

        for (const dto of hotels) {
          try {
            const existing = await db.hotel.findFirst({
              where: { tenantId, source: provider.providerType, externalCode: dto.code },
              select: {
                id: true,
                name: true,
                stars: true,
                city: true,
                country: true,
                latitude: true,
                longitude: true,
                description: true,
                address: true,
                website: true,
                amenities: true,
              },
            });
            const plan = planHotelUpsert(existing, dto, provider.providerType);

            let hotelId: string | null = existing?.id ?? null;
            if (plan.action === "create") {
              const created = await db.hotel.create({
                data: {
                  tenantId,
                  ...plan.data,
                  coverImageUrl: dto.images[0]?.url ?? null,
                },
                select: { id: true },
              });
              hotelId = created.id;
            } else if (plan.action === "update" && hotelId) {
              await db.hotel.update({
                where: { id: hotelId, tenantId },
                data: { ...plan.data, coverImageUrl: dto.images[0]?.url ?? undefined },
              });
            }
            if (plan.action !== "skip") processed.hotels++;

            // Synced images are always replaced wholesale — HotelImage rows
            // with fileKey === null are exclusively sync-owned (a manual
            // UploadThing upload always has a real fileKey), so this never
            // touches an image the agency uploaded by hand.
            if (hotelId && plan.action !== "skip") {
              await db.hotelImage.deleteMany({ where: { hotelId, tenantId, fileKey: null } });
              if (dto.images.length > 0) {
                await db.hotelImage.createMany({
                  data: dto.images.slice(0, 20).map((image, position) => ({
                    tenantId,
                    hotelId: hotelId!,
                    fileKey: null,
                    url: image.url,
                    alt: image.alt ?? null,
                    position,
                  })),
                });
              }
            }
          } catch (err) {
            errors.push(`hotel ${dto.code} (${city.code}): ${errorMessage(err)}`);
          }
        }
      } catch (err) {
        const message = `hotels for city ${city.code}: ${errorMessage(err)}`;
        errors.push(message);
        await recordProviderCall(db, tenantId, providerId, {
          operation: `listHotelsByCity(${city.code})`,
          ok: false,
          durationMs: 0,
          detail: errorMessage(err),
        });
      }
    }
  }

  const totalProcessed =
    processed.countries + processed.cities + processed.destinations + processed.hotels;
  // FAILED only when nothing at all could be processed and something went
  // wrong — a handful of bad records among thousands is not a failed run.
  const status: ContentSyncSummary["status"] =
    totalProcessed === 0 && errors.length > 0 ? "FAILED" : "SUCCESS";

  await db.providerSync.update({
    where: { id: syncRow.id, tenantId },
    data: {
      status,
      finishedAt: new Date(),
      recordsProcessed: totalProcessed,
      error: errors.length > 0 ? errors.slice(0, 20).join(" | ").slice(0, 2000) : null,
    },
  });

  if (errors.length > 0) {
    logger.warn("content-sync: run completed with errors", {
      tenantId,
      provider: provider.providerType,
      errorCount: errors.length,
      processed: totalProcessed,
    });
  }

  return { status, processed, errors, skipped, nextCursorCityCode };
}

function errorMessage(err: unknown): string {
  return asIntegrationError("content-sync", err).userMessage;
}

/** Re-exported for callers that only need to know the provider type name. */
export type { ProviderType };
