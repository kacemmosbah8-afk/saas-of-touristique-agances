import type {
  ProviderAuthType,
  ProviderConnectionStatus,
  ProviderCredentialType,
  ProviderEnvironment,
  ProviderHealthStatus,
  ProviderLogLevel,
  ProviderSyncStatus,
  ProviderType,
} from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type ProviderOverview = {
  id: string;
  type: ProviderType;
  enabled: boolean;
  connectionStatus: ProviderConnectionStatus | null;
  environment: ProviderEnvironment | null;
  healthStatus: ProviderHealthStatus | null;
  lastConnectedAt: Date | null;
  lastSyncAt: Date | null;
  openErrors: number;
};

/** Overview of every enabled provider record for the dashboard grid. */
export async function listProviders(db: TenantDb): Promise<ProviderOverview[]> {
  const providers = await db.provider.findMany({
    where: { deletedAt: null },
    include: {
      connection: true,
      health: true,
      _count: { select: { errors: { where: { resolved: false } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return providers.map((p) => ({
    id: p.id,
    type: p.type,
    enabled: p.enabled,
    connectionStatus: p.connection?.status ?? null,
    environment: p.connection?.environment ?? null,
    healthStatus: p.health?.status ?? null,
    lastConnectedAt: p.connection?.lastConnectedAt ?? null,
    lastSyncAt: p.connection?.lastSyncAt ?? null,
    openErrors: p._count.errors,
  }));
}

export type ProviderCredentialItem = {
  id: string;
  type: ProviderCredentialType;
  /** Masked for display — plaintext never leaves the server. */
  maskedValue: string;
  expiresAt: Date | null;
  updatedAt: Date;
};

export type ProviderLogItem = {
  id: string;
  level: ProviderLogLevel;
  message: string;
  createdAt: Date;
};

export type ProviderSyncItem = {
  id: string;
  status: ProviderSyncStatus;
  startedAt: Date;
  finishedAt: Date | null;
  recordsProcessed: number;
  error: string | null;
};

export type ProviderErrorItem = {
  id: string;
  code: string | null;
  message: string;
  resolved: boolean;
  createdAt: Date;
};

export type ProviderWebhookItem = {
  id: string;
  event: string;
  url: string;
  enabled: boolean;
};

export type ProviderDetail = {
  id: string;
  type: ProviderType;
  enabled: boolean;
  connection: {
    id: string;
    environment: ProviderEnvironment;
    authType: ProviderAuthType;
    status: ProviderConnectionStatus;
    baseUrl: string | null;
    lastConnectedAt: Date | null;
    lastSyncAt: Date | null;
    tokenExpiresAt: Date | null;
    autoReconnect: boolean;
  } | null;
  credentials: ProviderCredentialItem[];
  capabilities: { id: string; name: string; enabled: boolean }[];
  webhooks: ProviderWebhookItem[];
  logs: ProviderLogItem[];
  syncs: ProviderSyncItem[];
  errors: ProviderErrorItem[];
  health: {
    status: ProviderHealthStatus;
    latencyMs: number | null;
    lastCheckedAt: Date | null;
    message: string | null;
  } | null;
  rateLimit: {
    limitPerMinute: number | null;
    limitPerDay: number | null;
    remaining: number | null;
    resetAt: Date | null;
  } | null;
};

function maskStored(length: number): string {
  // Stored values are encrypted; display a fixed-width mask hinting at length.
  return "•".repeat(Math.min(Math.max(length, 4), 16));
}

export async function getProviderDetail(
  db: TenantDb,
  providerId: string,
): Promise<ProviderDetail | null> {
  const provider = await db.provider.findFirst({
    where: { id: providerId, deletedAt: null },
    include: {
      connection: { include: { credentials: { orderBy: { type: "asc" } } } },
      capabilities: { orderBy: { name: "asc" } },
      webhooks: { orderBy: { createdAt: "asc" } },
      logs: { orderBy: { createdAt: "desc" }, take: 100 },
      syncs: { orderBy: { createdAt: "desc" }, take: 20 },
      errors: { orderBy: { createdAt: "desc" }, take: 50 },
      health: true,
      rateLimit: true,
    },
  });
  if (!provider) return null;

  return {
    id: provider.id,
    type: provider.type,
    enabled: provider.enabled,
    connection: provider.connection
      ? {
          id: provider.connection.id,
          environment: provider.connection.environment,
          authType: provider.connection.authType,
          status: provider.connection.status,
          baseUrl: provider.connection.baseUrl,
          lastConnectedAt: provider.connection.lastConnectedAt,
          lastSyncAt: provider.connection.lastSyncAt,
          tokenExpiresAt: provider.connection.tokenExpiresAt,
          autoReconnect: provider.connection.autoReconnect,
        }
      : null,
    credentials: (provider.connection?.credentials ?? []).map((c) => ({
      id: c.id,
      type: c.type,
      maskedValue: maskStored(c.encryptedValue.length / 4),
      expiresAt: c.expiresAt,
      updatedAt: c.updatedAt,
    })),
    capabilities: provider.capabilities.map((c) => ({
      id: c.id,
      name: c.name,
      enabled: c.enabled,
    })),
    webhooks: provider.webhooks.map((w) => ({
      id: w.id,
      event: w.event,
      url: w.url,
      enabled: w.enabled,
    })),
    logs: provider.logs.map((l) => ({
      id: l.id,
      level: l.level,
      message: l.message,
      createdAt: l.createdAt,
    })),
    syncs: provider.syncs.map((s) => ({
      id: s.id,
      status: s.status,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
      recordsProcessed: s.recordsProcessed,
      error: s.error,
    })),
    errors: provider.errors.map((e) => ({
      id: e.id,
      code: e.code,
      message: e.message,
      resolved: e.resolved,
      createdAt: e.createdAt,
    })),
    health: provider.health
      ? {
          status: provider.health.status,
          latencyMs: provider.health.latencyMs,
          lastCheckedAt: provider.health.lastCheckedAt,
          message: provider.health.message,
        }
      : null,
    rateLimit: provider.rateLimit
      ? {
          limitPerMinute: provider.rateLimit.limitPerMinute,
          limitPerDay: provider.rateLimit.limitPerDay,
          remaining: provider.rateLimit.remaining,
          resetAt: provider.rateLimit.resetAt,
        }
      : null,
  };
}
