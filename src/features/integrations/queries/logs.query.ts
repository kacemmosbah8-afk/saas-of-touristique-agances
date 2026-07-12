import "server-only";
import type { Prisma, ProviderLogLevel, ProviderSyncStatus, ProviderType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { pageMeta, paginate } from "@/shared/lib/list-query";
import { INTEGRATION_TYPES } from "@/features/integrations/lib/registry";
import type { LogsFilters } from "@/features/integrations/schemas/integration.schema";

export type IntegrationLogItem = {
  id: string;
  providerType: ProviderType;
  level: ProviderLogLevel;
  message: string;
  durationMs: number | null;
  createdAt: Date;
};

export type IntegrationLogsResult = {
  logs: IntegrationLogItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listIntegrationLogs(
  db: TenantDb,
  filters: LogsFilters = {},
): Promise<IntegrationLogsResult> {
  const { provider, level } = filters;
  const { page, skip, take } = paginate(filters.page);

  const where: Prisma.ProviderLogWhereInput = {
    provider: {
      type: provider && provider !== "all" ? provider : { in: [...INTEGRATION_TYPES] },
    },
    ...(level && level !== "all" ? { level } : {}),
  };

  const [logs, total] = await Promise.all([
    db.providerLog.findMany({
      where,
      include: { provider: { select: { type: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.providerLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => {
      const metadata = (log.metadata ?? {}) as { durationMs?: unknown };
      return {
        id: log.id,
        providerType: log.provider.type,
        level: log.level,
        message: log.message,
        durationMs: typeof metadata.durationMs === "number" ? metadata.durationMs : null,
        createdAt: log.createdAt,
      };
    }),
    ...pageMeta(total, page),
  };
}

export type SyncHistoryItem = {
  id: string;
  providerType: ProviderType;
  status: ProviderSyncStatus;
  startedAt: Date;
  finishedAt: Date | null;
  recordsProcessed: number;
  error: string | null;
};

export async function listSyncHistory(db: TenantDb, take = 25): Promise<SyncHistoryItem[]> {
  const syncs = await db.providerSync.findMany({
    where: { provider: { type: { in: [...INTEGRATION_TYPES] } } },
    include: { provider: { select: { type: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
  return syncs.map((sync) => ({
    id: sync.id,
    providerType: sync.provider.type,
    status: sync.status,
    startedAt: sync.startedAt,
    finishedAt: sync.finishedAt,
    recordsProcessed: sync.recordsProcessed,
    error: sync.error,
  }));
}
