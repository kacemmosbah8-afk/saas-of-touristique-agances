import "server-only";
import type { ProviderLogLevel, ProviderType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { PROVIDER_REGISTRY } from "@/features/providers/lib/provider-registry";

/**
 * Bridge between the live integrations layer and the tenant Provider records
 * introduced in the previous milestone. Health, logs, syncs, and errors for
 * external calls all attach to the tenant's Provider row — this helper
 * creates it on first use so monitoring works without manual enablement.
 */
export async function ensureProviderRecord(
  db: TenantDb,
  tenantId: string,
  type: ProviderType,
): Promise<string> {
  const existing = await db.provider.findFirst({
    where: { type, tenantId },
    select: { id: true, deletedAt: true },
  });
  if (existing) {
    if (existing.deletedAt) {
      await db.provider.update({
        where: { id: existing.id, tenantId },
        data: { deletedAt: null, enabled: true },
      });
    }
    return existing.id;
  }

  const meta = PROVIDER_REGISTRY[type];
  const provider = await db.provider.create({
    data: {
      tenantId,
      type,
      name: meta.name,
      description: meta.description,
      enabled: true,
      connection: {
        create: {
          tenantId,
          environment: "SANDBOX",
          authType: meta.authType,
          baseUrl: meta.sandboxUrl,
        },
      },
      capabilities: {
        create: meta.capabilities.map((name) => ({ tenantId, name })),
      },
      health: { create: { tenantId, status: "UNKNOWN" } },
      rateLimit: { create: { tenantId } },
    },
    select: { id: true },
  });
  return provider.id;
}

/** Persist one API-call record to the provider's log (monitoring). */
export async function recordProviderCall(
  db: TenantDb,
  tenantId: string,
  providerId: string,
  params: {
    operation: string;
    ok: boolean;
    durationMs: number;
    detail?: string;
    cacheHit?: boolean;
  },
): Promise<void> {
  const level: ProviderLogLevel = params.ok ? "INFO" : "ERROR";
  await db.providerLog.create({
    data: {
      tenantId,
      providerId,
      level,
      message: `${params.operation} ${params.ok ? "ok" : "failed"} in ${params.durationMs}ms${
        params.cacheHit ? " (cache)" : ""
      }${params.detail ? ` — ${params.detail}` : ""}`,
      metadata: {
        operation: params.operation,
        ok: params.ok,
        durationMs: params.durationMs,
        cacheHit: params.cacheHit ?? false,
      },
    },
  });

  if (!params.ok) {
    await db.providerError.create({
      data: {
        tenantId,
        providerId,
        code: params.operation,
        message: params.detail ?? "Request failed",
      },
    });
  } else {
    // A successful call refreshes the connection's last-success marker.
    await db.providerConnection.updateMany({
      where: { providerId },
      data: { lastConnectedAt: new Date(), status: "CONNECTED" },
    });
  }
}
