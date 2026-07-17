import "server-only";
import type { ProviderSyncStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { contentSyncSettingsSchema, type ContentSyncSettings } from "@/features/content-sync/schemas/content-sync.schema";
import { SYNC_CONTENT_JOB_TYPE } from "@/features/automation/handlers/sync-content.handler";

export type ContentSyncHistoryItem = {
  id: string;
  status: ProviderSyncStatus;
  startedAt: Date;
  finishedAt: Date | null;
  recordsProcessed: number;
  error: string | null;
};

export type ContentSyncCounts = {
  countries: number;
  cities: number;
  destinations: number;
  hotels: number;
};

export type ContentSyncStatus = {
  settings: ContentSyncSettings;
  /** True once a run has completed at least once — settings.enabled alone doesn't tell you that. */
  hasSyncedBefore: boolean;
  hasPendingRun: boolean;
  history: ContentSyncHistoryItem[];
  counts: ContentSyncCounts;
};

/**
 * Everything the content-sync panel needs in one read: current settings,
 * whether a run is already queued (so the UI doesn't offer a redundant
 * "Sync Now"), recent run history, and how much local content is actually
 * attributed to TravelPayouts today.
 */
export async function getContentSyncStatus(db: TenantDb): Promise<ContentSyncStatus> {
  const [settingsRow, pendingJob, syncs, countries, cities, destinations, hotels] = await Promise.all([
    db.tenantSettings.findFirst({ select: { contentSyncSettings: true } }),
    db.job.findFirst({
      where: { type: SYNC_CONTENT_JOB_TYPE, status: { in: ["PENDING", "RUNNING"] } },
      select: { id: true },
    }),
    db.providerSync.findMany({
      where: { provider: { type: "TRAVELPAYOUTS" } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.country.count({ where: { source: "TRAVELPAYOUTS" } }),
    db.city.count({ where: { source: "TRAVELPAYOUTS" } }),
    db.destination.count({ where: { source: "TRAVELPAYOUTS" } }),
    db.hotel.count({ where: { source: "TRAVELPAYOUTS" } }),
  ]);

  return {
    settings: contentSyncSettingsSchema.parse(settingsRow?.contentSyncSettings ?? {}),
    hasSyncedBefore: syncs.length > 0,
    hasPendingRun: Boolean(pendingJob),
    history: syncs.map((sync) => ({
      id: sync.id,
      status: sync.status,
      startedAt: sync.startedAt,
      finishedAt: sync.finishedAt,
      recordsProcessed: sync.recordsProcessed,
      error: sync.error,
    })),
    counts: { countries, cities, destinations, hotels },
  };
}
