import "server-only";
import type { ProviderType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { asIntegrationError } from "@/features/integrations/lib/errors";
import {
  ensureProviderRecord,
  recordProviderCall,
} from "@/features/integrations/lib/provider-record";
import type { ActionResult } from "@/shared/types/action-result";

/**
 * Execute one integration operation with full monitoring: ensures the
 * tenant's Provider record exists, measures duration, records the call
 * (log + error rows + connection freshness), and converts thrown
 * integration errors into safe ActionResult messages.
 */
export async function runIntegrationCall<T>(params: {
  db: TenantDb;
  tenantId: string;
  type: ProviderType;
  operation: string;
  fn: () => Promise<T>;
  cacheHit?: boolean;
}): Promise<ActionResult<{ result: T; durationMs: number }>> {
  const providerId = await ensureProviderRecord(params.db, params.tenantId, params.type);
  const started = Date.now();

  try {
    const result = await params.fn();
    const durationMs = Date.now() - started;
    await recordProviderCall(params.db, params.tenantId, providerId, {
      operation: params.operation,
      ok: true,
      durationMs,
      cacheHit: params.cacheHit,
    });
    return { ok: true, data: { result, durationMs } };
  } catch (err) {
    const durationMs = Date.now() - started;
    const integrationError = asIntegrationError(params.type, err);
    logger.error("integration call failed", {
      tenantId: params.tenantId,
      type: params.type,
      operation: params.operation,
      code: integrationError.code,
      error: integrationError.message,
    });
    await recordProviderCall(params.db, params.tenantId, providerId, {
      operation: params.operation,
      ok: false,
      durationMs,
      detail: integrationError.message.slice(0, 300),
    }).catch(() => undefined);
    return { ok: false, error: integrationError.userMessage };
  }
}
