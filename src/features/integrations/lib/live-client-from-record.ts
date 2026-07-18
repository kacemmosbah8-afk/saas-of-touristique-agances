import "server-only";
import type { ProviderType } from "@prisma/client";

import {
  createHotelbedsClient,
  type HotelbedsClient,
} from "@/features/integrations/providers/hotelbeds/hotelbeds-client";
import {
  createAmadeusClient,
  type AmadeusClient,
} from "@/features/integrations/providers/amadeus/amadeus-client";

/**
 * Build a live client from a decrypted credential record (keyed by
 * ProviderCredential type) — the shape the M2 provider-dashboard flow already
 * produces per tenant. Returns null when required credentials are missing.
 * Bridges the generic provider adapter to the typed integration clients so
 * both the Providers dashboard and the Integrations page test the tenant's
 * own account.
 */
export function buildLiveClientFromRecord(
  type: ProviderType,
  record: Record<string, string>,
  baseUrl: string,
): HotelbedsClient | AmadeusClient | null {
  switch (type) {
    case "HOTELBEDS": {
      const apiKey = record.API_KEY;
      const secret = record.API_SECRET;
      if (!apiKey || !secret) return null;
      const environment = baseUrl.includes("api.test.") ? "test" : "live";
      return createHotelbedsClient({ apiKey, secret, environment });
    }
    case "AMADEUS": {
      const clientId = record.API_KEY;
      const clientSecret = record.API_SECRET;
      return clientId && clientSecret ? createAmadeusClient({ clientId, clientSecret }) : null;
    }
    default:
      return null;
  }
}
