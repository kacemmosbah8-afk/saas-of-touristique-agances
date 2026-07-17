import "server-only";
import type { ProviderType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import type { HealthCheckResult } from "@/features/integrations/lib/dto";
import { asIntegrationError } from "@/features/integrations/lib/errors";
import {
  getDuffelClientForTenant,
  getHotelbedsClientForTenant,
  getAmadeusClientForTenant,
  getTravelPayoutsClientForTenant,
} from "@/features/integrations/lib/client-factory";

/**
 * Registry of live external integrations. Holds only static metadata; whether
 * a provider is usable and healthy is a *per-tenant* question answered by the
 * credential resolver (see healthCheckForTenant). Business logic asks this
 * module which integrations exist — it never imports a provider client, so
 * adding a provider means adding one entry here.
 */

export const INTEGRATION_TYPES = ["DUFFEL", "HOTELBEDS", "AMADEUS", "TRAVELPAYOUTS"] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export type IntegrationDescriptor = {
  type: IntegrationType;
  name: string;
  kind:
    | "Flights"
    | "Hotels, Activities & Transfers"
    | "Flights & Hotels (GDS)"
    | "Content Sync";
  description: string;
  /** Env vars that, if set, provide an optional platform-wide fallback. */
  platformEnvVars: string[];
};

export const INTEGRATIONS: Record<IntegrationType, IntegrationDescriptor> = {
  DUFFEL: {
    type: "DUFFEL",
    name: "Duffel",
    kind: "Flights",
    description: "Flight search and NDC content — airports, airlines, live offers.",
    platformEnvVars: ["DUFFEL_TOKEN"],
  },
  HOTELBEDS: {
    type: "HOTELBEDS",
    name: "Hotelbeds",
    kind: "Hotels, Activities & Transfers",
    description: "Bedbank hotel availability plus destination content, activities, and transfers.",
    platformEnvVars: ["HOTELBEDS_HOTEL_API_KEY", "HOTELBEDS_HOTEL_SECRET", "HOTELBEDS_ENVIRONMENT"],
  },
  AMADEUS: {
    type: "AMADEUS",
    name: "Amadeus",
    kind: "Flights & Hotels (GDS)",
    description: "GDS content via the self-service APIs. OAuth2 flow is ready.",
    platformEnvVars: ["AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET"],
  },
  TRAVELPAYOUTS: {
    type: "TRAVELPAYOUTS",
    name: "TravelPayouts",
    kind: "Content Sync",
    description:
      "Hotel, destination, city, and country content — the primary content source for the public catalogue. Never used for booking.",
    platformEnvVars: ["TRAVELPAYOUTS_TOKEN"],
  },
};

export function isIntegrationType(type: ProviderType): type is IntegrationType {
  return (INTEGRATION_TYPES as readonly string[]).includes(type);
}

/**
 * Run a health check for one tenant against that tenant's own credentials.
 * Returns a not-configured result (never throws) when the tenant has not
 * connected the provider.
 */
export async function healthCheckForTenant(
  db: TenantDb,
  tenantId: string,
  type: IntegrationType,
): Promise<HealthCheckResult> {
  const descriptor = INTEGRATIONS[type];
  try {
    switch (type) {
      case "DUFFEL": {
        const result = await getDuffelClientForTenant(db, tenantId);
        if (!result.ok) return { ok: false, latencyMs: 0, message: result.error };
        return result.client.healthCheck();
      }
      case "HOTELBEDS": {
        const result = await getHotelbedsClientForTenant(db, tenantId);
        if (!result.ok) return { ok: false, latencyMs: 0, message: result.error };
        return result.client.healthCheck();
      }
      case "AMADEUS": {
        const result = await getAmadeusClientForTenant(db, tenantId);
        if (!result.ok) return { ok: false, latencyMs: 0, message: result.error };
        return result.client.healthCheck();
      }
      case "TRAVELPAYOUTS": {
        const result = await getTravelPayoutsClientForTenant(db, tenantId);
        if (!result.ok) return { ok: false, latencyMs: 0, message: result.error };
        return result.client.healthCheck();
      }
    }
  } catch (err) {
    return { ok: false, latencyMs: 0, message: asIntegrationError(descriptor.name, err).userMessage };
  }
}
