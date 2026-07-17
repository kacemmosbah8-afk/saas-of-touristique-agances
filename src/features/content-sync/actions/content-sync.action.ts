"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { enqueueJob } from "@/features/automation/lib/engine";
import { SYNC_CONTENT_JOB_TYPE } from "@/features/automation/handlers/sync-content.handler";
import {
  contentSyncSettingsSchema,
  type ContentSyncSettings,
} from "@/features/content-sync/schemas/content-sync.schema";
import type { ActionResult } from "@/shared/types/action-result";

/**
 * Save the tenant's content-sync policy. `enabled` is the only field that
 * changes what happens next: turning it on (from off, or on first save)
 * starts the self-rescheduling job chain by enqueueing the first run — see
 * `handlers/sync-content.handler.ts` for why every subsequent run
 * re-enqueues itself rather than relying on a fixed cron interval. Turning
 * it off does nothing here; the chain stops itself the next time a queued
 * run reads `enabled: false`.
 */
export async function updateContentSyncSettingsAction(
  tenantId: string,
  input: Partial<ContentSyncSettings>,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  const existingRow = await db.tenantSettings.findFirst({ select: { contentSyncSettings: true } });
  const previous = contentSyncSettingsSchema.parse(existingRow?.contentSyncSettings ?? {});

  const parsed = contentSyncSettingsSchema.safeParse({ ...previous, ...input });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings." };
  }
  const settings = parsed.data;

  await db.tenantSettings.upsert({
    where: { tenantId },
    create: { tenantId, contentSyncSettings: settings as Prisma.InputJsonValue },
    update: { contentSyncSettings: settings as Prisma.InputJsonValue },
  });

  if (settings.enabled && !previous.enabled) {
    const existingRun = await db.job.findFirst({
      where: { type: SYNC_CONTENT_JOB_TYPE, status: { in: ["PENDING", "RUNNING"] } },
      select: { id: true },
    });
    if (!existingRun) {
      await enqueueJob({
        type: SYNC_CONTENT_JOB_TYPE,
        tenantId,
        payload: { tenantId, cursorCityCode: null },
      });
    }
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update-content-sync-settings",
    entity: "settings",
    metadata: settings,
  });
  logger.info("content-sync settings updated", { tenantId, enabled: settings.enabled });
  return { ok: true };
}

/**
 * Manual "Sync Now" — enqueues one immediate run regardless of the
 * `enabled` setting (`force: true` tells the handler to run even while
 * disabled) without starting or extending the recurring chain.
 */
export async function triggerContentSyncNowAction(tenantId: string): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  const existingRun = await db.job.findFirst({
    where: { type: SYNC_CONTENT_JOB_TYPE, status: { in: ["PENDING", "RUNNING"] } },
    select: { id: true },
  });
  if (existingRun) {
    return { ok: false, error: "A content sync is already running or queued." };
  }

  await enqueueJob({
    type: SYNC_CONTENT_JOB_TYPE,
    tenantId,
    payload: { tenantId, cursorCityCode: null, force: true },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "trigger-content-sync",
    entity: "settings",
  });
  logger.info("content-sync manual run triggered", { tenantId });
  return { ok: true };
}
