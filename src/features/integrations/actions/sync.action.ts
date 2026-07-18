"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { asIntegrationError } from "@/features/integrations/lib/errors";
import { ensureProviderRecord } from "@/features/integrations/lib/provider-record";
import { INTEGRATIONS } from "@/features/integrations/lib/registry";
import { getHotelbedsClientForTenant } from "@/features/integrations/lib/client-factory";
import {
  runDatasetSync,
  SYNC_DATASET_PROVIDER,
  type SyncClients,
} from "@/features/integrations/sync/sync-service";
import {
  runSyncSchema,
  type RunSyncInput,
} from "@/features/integrations/schemas/integration.schema";
import type { ActionResult } from "@/shared/types/action-result";

export type SyncRunData = {
  processed: number;
  detail: string;
  durationMs: number;
};

/**
 * Manual dataset sync. Records a ProviderSync row for history, provider log
 * entries, and error records on failure. The same code path is what a
 * scheduled background runner will invoke in a future milestone — it only
 * needs a trigger, not new logic.
 */
export async function runSyncAction(
  tenantId: string,
  input: RunSyncInput,
): Promise<ActionResult<SyncRunData>> {
  const { session, db } = await requirePermission(tenantId, "provider", "update");

  const parsed = runSyncSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const providerType = SYNC_DATASET_PROVIDER[parsed.data.dataset];
  const descriptor = INTEGRATIONS[providerType as keyof typeof INTEGRATIONS];

  // Resolve the tenant's own client for the provider this dataset needs.
  const clients: SyncClients = {};
  if (providerType === "HOTELBEDS") {
    const result = await getHotelbedsClientForTenant(db, tenantId);
    if (!result.ok) return { ok: false, error: result.error };
    clients.hotelbeds = result.client;
  }

  const providerId = await ensureProviderRecord(db, tenantId, providerType);

  const sync = await db.providerSync.create({
    data: { tenantId, providerId, status: "RUNNING" },
    select: { id: true },
  });

  const started = Date.now();
  try {
    const outcome = await runDatasetSync(
      db,
      tenantId,
      parsed.data.dataset,
      clients,
      parsed.data.destinationCode || undefined,
    );
    const durationMs = Date.now() - started;

    await Promise.all([
      db.providerSync.update({
        where: { id: sync.id, tenantId },
        data: {
          status: "SUCCESS",
          finishedAt: new Date(),
          recordsProcessed: outcome.processed,
        },
      }),
      db.providerConnection.updateMany({
        where: { providerId },
        data: { lastSyncAt: new Date(), status: "CONNECTED", lastConnectedAt: new Date() },
      }),
      db.providerLog.create({
        data: {
          tenantId,
          providerId,
          level: "INFO",
          message: `Sync ${parsed.data.dataset}: ${outcome.detail} (${durationMs}ms)`,
          metadata: { dataset: parsed.data.dataset, processed: outcome.processed, durationMs },
        },
      }),
    ]);

    await writeAudit(db, {
      userId: session.user.id,
      action: "sync-dataset",
      entity: "provider",
      entityId: providerId,
      metadata: { dataset: parsed.data.dataset, processed: outcome.processed },
    });

    logger.info("dataset sync completed", {
      tenantId,
      dataset: parsed.data.dataset,
      processed: outcome.processed,
      durationMs,
    });
    return { ok: true, data: { ...outcome, durationMs } };
  } catch (err) {
    const durationMs = Date.now() - started;
    const integrationError = asIntegrationError(descriptor.name, err);

    await Promise.all([
      db.providerSync.update({
        where: { id: sync.id, tenantId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          error: integrationError.message.slice(0, 500),
        },
      }),
      db.providerError.create({
        data: {
          tenantId,
          providerId,
          code: `SYNC_${parsed.data.dataset.toUpperCase()}`,
          message: integrationError.message.slice(0, 500),
        },
      }),
      db.providerLog.create({
        data: {
          tenantId,
          providerId,
          level: "ERROR",
          message: `Sync ${parsed.data.dataset} failed after ${durationMs}ms: ${integrationError.message.slice(0, 300)}`,
        },
      }),
    ]);

    logger.error("dataset sync failed", {
      tenantId,
      dataset: parsed.data.dataset,
      error: integrationError.message,
    });
    return { ok: false, error: integrationError.userMessage };
  }
}
