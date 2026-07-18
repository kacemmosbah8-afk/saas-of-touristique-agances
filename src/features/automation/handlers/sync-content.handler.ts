import "server-only";
import { z } from "zod";

import { getTenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { getTravelPayoutsClientForTenant } from "@/features/integrations/lib/client-factory";
import { createTravelPayoutsContentProvider } from "@/features/content-sync/providers/travelpayouts/travelpayouts-provider";
import { runContentSync } from "@/features/content-sync/lib/engine";
import { contentSyncSettingsSchema } from "@/features/content-sync/schemas/content-sync.schema";
import type { JobHandler, JobHandlerResult, JobContext } from "@/features/automation/lib/types";
import { registerJobHandler } from "@/features/automation/lib/registry";
import { enqueueJob } from "@/features/automation/lib/engine";

export const SYNC_CONTENT_JOB_TYPE = "SYNC_CONTENT";

const payloadSchema = z.object({
  tenantId: z.string().min(1),
  /** Resume point for the hotels dataset — carried forward from the previous run's summary. */
  cursorCityCode: z.string().nullable().optional(),
  /** Manual "Sync Now" trigger — runs once even while disabled, but never starts recurrence. */
  force: z.boolean().optional(),
});

export type SyncContentJobPayload = z.infer<typeof payloadSchema>;

/**
 * The TravelPayouts Content Synchronization Engine's scheduling mechanism.
 * There is no separate cron for this — it rides the job engine's existing
 * Job/JobEvent tables and the existing `/api/jobs/process` cron, exactly
 * like `SEND_COMMUNICATION` already does.
 *
 * Unlike that one, a content sync is *periodic* rather than "runs once,
 * maybe retries" — so this handler self-reschedules: on every invocation it
 * enqueues its own successor at `now + intervalMinutes`, regardless of
 * whether this run succeeded. That reschedule is unconditional (not gated
 * on `retryable`) on purpose, for two reasons:
 *   1. It guarantees the chain survives a bad run (expired token, provider
 *      outage) without operator intervention — the next attempt is already
 *      queued before this one even reports its own outcome.
 *   2. It keeps the engine's own per-job backoff (`nextAvailableAt`) out of
 *      the loop entirely, so there is exactly one active successor job per
 *      tenant at a time, never two competing schedules. A failed run always
 *      returns `retryable: false` — this job attempt is done either way;
 *      recovery is "wait for the next cycle," not "retry this job."
 * The only thing that stops the chain is `contentSyncSettings.enabled`
 * being false when a run starts.
 */
async function handle(payload: unknown, context: JobContext): Promise<JobHandlerResult> {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      retryable: false,
      message: `Invalid SYNC_CONTENT payload: ${parsed.error.issues[0]?.message ?? "unknown error"}.`,
    };
  }

  const tenantId = context.tenantId ?? parsed.data.tenantId;
  const db = getTenantDb(tenantId);

  const settingsRow = await db.tenantSettings.findFirst({ select: { contentSyncSettings: true } });
  const settings = contentSyncSettingsSchema.parse(settingsRow?.contentSyncSettings ?? {});

  if (!settings.enabled && !parsed.data.force) {
    logger.info("content-sync: skipped, disabled for tenant", { tenantId });
    return { ok: true };
  }

  let outcome: JobHandlerResult;
  let nextCursor: string | null = parsed.data.cursorCityCode ?? null;

  const clientResult = await getTravelPayoutsClientForTenant(db, tenantId);
  if (!clientResult.ok) {
    outcome = { ok: false, retryable: false, message: clientResult.error };
    logger.warn("content-sync: no TravelPayouts client available", { tenantId, error: clientResult.error });
  } else {
    try {
      const provider = createTravelPayoutsContentProvider(clientResult.client);
      const summary = await runContentSync(db, tenantId, provider, {
        datasets: settings.datasets,
        cursorCityCode: parsed.data.cursorCityCode ?? null,
      });
      nextCursor = summary.nextCursorCityCode;
      outcome =
        summary.status === "SUCCESS"
          ? { ok: true }
          : {
              ok: false,
              retryable: false,
              message: summary.errors.slice(0, 3).join(" | ") || "Content sync run failed.",
            };
    } catch (err) {
      outcome = {
        ok: false,
        retryable: false,
        message: err instanceof Error ? err.message : "Unhandled content-sync error.",
      };
      logger.error("content-sync: handler threw", { tenantId, error: String(err) });
    }
  }

  if (settings.enabled) {
    await enqueueJob({
      type: SYNC_CONTENT_JOB_TYPE,
      tenantId,
      payload: { tenantId, cursorCityCode: nextCursor },
      availableAt: new Date(Date.now() + settings.intervalMinutes * 60_000),
    });
  }

  return outcome;
}

export const syncContentJobHandler: JobHandler = {
  type: SYNC_CONTENT_JOB_TYPE,
  handle,
};

registerJobHandler(syncContentJobHandler);
