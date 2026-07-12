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
import type { CredentialSource } from "@/features/integrations/lib/credentials";
import { resolveTenantCredentials } from "@/features/integrations/lib/resolve-credentials";

export type IntegrationOverview = {
  type: IntegrationType;
  name: string;
  kind: string;
  description: string;
  platformEnvVars: string[];
  /** Whether this agency can call the provider at all (tenant or platform). */
  configured: boolean;
  /** Where the usable credentials came from — the crux of multi-tenancy. */
  credentialSource: CredentialSource | null;
  /** Whether this agency has stored its own credentials (vs shared fallback). */
  hasOwnCredentials: boolean;
  enabled: boolean;
  providerId: string | null;
  connectionStatus: ProviderConnectionStatus | null;
  healthStatus: ProviderHealthStatus | null;
  latencyMs: number | null;
  lastSuccessAt: Date | null;
  lastSyncAt: Date | null;
  lastError: { message: string; at: Date } | null;
};

/**
 * Per-tenant status of the three live integrations. Each row reflects *this
 * agency's* credentials and connection — Agency A and Agency B see entirely
 * independent state.
 */
export async function getIntegrationsOverview(
  db: TenantDb,
  tenantId: string,
): Promise<IntegrationOverview[]> {
  const providers = await db.provider.findMany({
    where: { type: { in: [...INTEGRATION_TYPES] } },
    include: {
      connection: true,
      health: true,
      errors: { where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const byType = new Map(providers.map((p) => [p.type, p]));

  return Promise.all(
    INTEGRATION_TYPES.map(async (type) => {
      const descriptor = INTEGRATIONS[type];
      const record = byType.get(type);
      const latestError = record?.errors[0] ?? null;

      const resolved = await resolveTenantCredentials(db, tenantId, type);

      return {
        type,
        name: descriptor.name,
        kind: descriptor.kind,
        description: descriptor.description,
        platformEnvVars: descriptor.platformEnvVars,
        configured: resolved.configured,
        credentialSource: resolved.source,
        hasOwnCredentials: resolved.configured && resolved.source === "tenant",
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
    }),
  );
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
