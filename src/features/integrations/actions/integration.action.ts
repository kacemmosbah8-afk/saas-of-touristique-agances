"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { INTEGRATIONS } from "@/features/integrations/lib/registry";
import { ensureProviderRecord } from "@/features/integrations/lib/provider-record";
import { asIntegrationError } from "@/features/integrations/lib/errors";
import {
  integrationTypeSchema,
  toggleIntegrationSchema,
  type IntegrationTypeInput,
  type ToggleIntegrationInput,
} from "@/features/integrations/schemas/integration.schema";
import type { ActionResult } from "@/shared/types/action-result";

export type IntegrationTestData = {
  ok: boolean;
  latencyMs: number;
  message: string;
};

/**
 * Run a live health check against the provider and persist the outcome
 * (connection status, health row, log entry, error record on failure).
 */
export async function testIntegrationAction(
  tenantId: string,
  input: IntegrationTypeInput,
): Promise<ActionResult<IntegrationTestData>> {
  const { session, db } = await requirePermission(tenantId, "provider", "update");

  const parsed = integrationTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid integration." };

  const descriptor = INTEGRATIONS[parsed.data.type];
  const providerId = await ensureProviderRecord(db, tenantId, parsed.data.type);

  let result: IntegrationTestData;
  try {
    result = await descriptor.healthCheck();
  } catch (err) {
    const integrationError = asIntegrationError(descriptor.name, err);
    result = { ok: false, latencyMs: 0, message: integrationError.userMessage };
  }

  const now = new Date();
  await Promise.all([
    db.providerConnection.updateMany({
      where: { providerId },
      data: {
        status: result.ok ? "CONNECTED" : descriptor.isConfigured() ? "ERROR" : "DISCONNECTED",
        ...(result.ok ? { lastConnectedAt: now } : {}),
      },
    }),
    db.providerHealth.upsert({
      where: { providerId },
      create: {
        tenantId,
        providerId,
        status: result.ok ? "HEALTHY" : "DOWN",
        latencyMs: result.latencyMs,
        lastCheckedAt: now,
        message: result.message,
      },
      update: {
        status: result.ok ? "HEALTHY" : "DOWN",
        latencyMs: result.latencyMs,
        lastCheckedAt: now,
        message: result.message,
      },
    }),
    db.providerLog.create({
      data: {
        tenantId,
        providerId,
        level: result.ok ? "INFO" : "ERROR",
        message: `Health check ${result.ok ? "passed" : "failed"}: ${result.message}`,
        metadata: { latencyMs: result.latencyMs },
      },
    }),
  ]);

  if (!result.ok && descriptor.isConfigured()) {
    await db.providerError.create({
      data: { tenantId, providerId, code: "HEALTH_CHECK", message: result.message },
    });
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "test-integration",
    entity: "provider",
    entityId: providerId,
    metadata: { type: parsed.data.type, ok: result.ok },
  });

  logger.info("integration health check", {
    tenantId,
    type: parsed.data.type,
    ok: result.ok,
    latencyMs: result.latencyMs,
  });
  return { ok: true, data: result };
}

export async function toggleIntegrationAction(
  tenantId: string,
  input: ToggleIntegrationInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "provider", "manage");

  const parsed = toggleIntegrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const providerId = await ensureProviderRecord(db, tenantId, parsed.data.type);

  await db.provider.update({
    where: { id: providerId, tenantId },
    data: { enabled: parsed.data.enabled },
  });
  if (!parsed.data.enabled) {
    await db.providerConnection.updateMany({
      where: { providerId },
      data: { status: "DISCONNECTED" },
    });
  }

  await db.providerLog.create({
    data: {
      tenantId,
      providerId,
      level: "INFO",
      message: `Integration ${parsed.data.enabled ? "enabled" : "disabled"}`,
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: parsed.data.enabled ? "enable-integration" : "disable-integration",
    entity: "provider",
    entityId: providerId,
    metadata: { type: parsed.data.type },
  });
  return { ok: true };
}
