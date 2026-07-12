import "server-only";
import type {
  ProviderConnectionStatus,
  ProviderHealthStatus,
} from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import {
  INTEGRATIONS,
  INTEGRATION_TYPES,
  type IntegrationType,
} from "@/features/integrations/lib/registry";

export type IntegrationOverview = {
  type: IntegrationType;
  name: string;
  kind: string;
  description: string;
  envVars: string[];
  configured: boolean;
  enabled: boolean;
  providerId: string | null;
  connectionStatus: ProviderConnectionStatus | null;
  healthStatus: ProviderHealthStatus | null;
  latencyMs: number | null;
  lastSuccessAt: Date | null;
  lastSyncAt: Date | null;
  lastError: { message: string; at: Date } | null;
};

/** Status of the three live integrations for the dashboard. */
export async function getIntegrationsOverview(db: TenantDb): Promise<IntegrationOverview[]> {
  const providers = await db.provider.findMany({
    where: { type: { in: [...INTEGRATION_TYPES] } },
    include: {
      connection: true,
      health: true,
      errors: { where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const byType = new Map(providers.map((p) => [p.type, p]));

  return INTEGRATION_TYPES.map((type) => {
    const descriptor = INTEGRATIONS[type];
    const record = byType.get(type);
    const latestError = record?.errors[0] ?? null;

    return {
      type,
      name: descriptor.name,
      kind: descriptor.kind,
      description: descriptor.description,
      envVars: descriptor.envVars,
      configured: descriptor.isConfigured(),
      enabled: record ? record.enabled && !record.deletedAt : false,
      providerId: record?.id ?? null,
      connectionStatus: record?.connection?.status ?? null,
      healthStatus: record?.health?.status ?? null,
      latencyMs: record?.health?.latencyMs ?? null,
      lastSuccessAt: record?.connection?.lastConnectedAt ?? null,
      lastSyncAt: record?.connection?.lastSyncAt ?? null,
      lastError: latestError
        ? { message: latestError.message, at: latestError.createdAt }
        : null,
    };
  });
}

export type ImportedDataCounts = {
  countries: number;
  cities: number;
  hotels: number;
  amenities: number;
  airports: number;
  airlines: number;
};

export async function getImportedDataCounts(db: TenantDb): Promise<ImportedDataCounts> {
  const [countries, cities, hotels, amenities, airports, airlines] = await Promise.all([
    db.country.count(),
    db.city.count(),
    db.hotel.count({ where: { source: { not: null }, deletedAt: null } }),
    db.amenity.count(),
    db.airport.count(),
    db.airline.count(),
  ]);
  return { countries, cities, hotels, amenities, airports, airlines };
}
