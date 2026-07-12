import "server-only";
import type { ProviderType } from "@prisma/client";

import { duffelClient } from "@/features/integrations/providers/duffel/duffel-client";
import { hotelbedsClient } from "@/features/integrations/providers/hotelbeds/hotelbeds-client";
import { amadeusClient } from "@/features/integrations/providers/amadeus/amadeus-client";
import type { HealthCheckResult } from "@/features/integrations/lib/dto";

/**
 * Registry of live external integrations. Business logic asks this module
 * "which integrations exist and are they configured?" — it never imports a
 * provider client directly, so adding a provider means adding one entry here.
 */

export const INTEGRATION_TYPES = ["DUFFEL", "HOTELBEDS", "AMADEUS"] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export type IntegrationDescriptor = {
  type: IntegrationType;
  name: string;
  kind: "Flights" | "Hotels, Activities & Transfers" | "Flights & Hotels (GDS)";
  description: string;
  /** Which env vars configure it (names only — values never leave the server). */
  envVars: string[];
  isConfigured: () => boolean;
  healthCheck: () => Promise<HealthCheckResult>;
};

export const INTEGRATIONS: Record<IntegrationType, IntegrationDescriptor> = {
  DUFFEL: {
    type: "DUFFEL",
    name: "Duffel",
    kind: "Flights",
    description: "Flight search and NDC content — airports, airlines, live offers.",
    envVars: ["DUFFEL_TOKEN"],
    isConfigured: () => duffelClient.isConfigured(),
    healthCheck: () => duffelClient.healthCheck(),
  },
  HOTELBEDS: {
    type: "HOTELBEDS",
    name: "Hotelbeds",
    kind: "Hotels, Activities & Transfers",
    description: "Bedbank hotel availability plus destination content, activities, and transfers.",
    envVars: ["HOTELBEDS_HOTEL_API_KEY", "HOTELBEDS_HOTEL_SECRET", "HOTELBEDS_ENVIRONMENT"],
    isConfigured: () => hotelbedsClient.isConfigured(),
    healthCheck: () => hotelbedsClient.healthCheck(),
  },
  AMADEUS: {
    type: "AMADEUS",
    name: "Amadeus",
    kind: "Flights & Hotels (GDS)",
    description: "GDS content via the self-service APIs. OAuth2 flow is ready — awaiting credentials.",
    envVars: ["AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET"],
    isConfigured: () => amadeusClient.isConfigured(),
    healthCheck: () => amadeusClient.healthCheck(),
  },
};

export function isIntegrationType(type: ProviderType): type is IntegrationType {
  return (INTEGRATION_TYPES as readonly string[]).includes(type);
}
