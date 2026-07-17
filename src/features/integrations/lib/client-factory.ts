import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import type { CredentialSource } from "@/features/integrations/lib/credentials";
import { resolveTenantCredentials } from "@/features/integrations/lib/resolve-credentials";
import {
  DuffelClient,
  createDuffelClient,
} from "@/features/integrations/providers/duffel/duffel-client";
import {
  HotelbedsClient,
  createHotelbedsClient,
} from "@/features/integrations/providers/hotelbeds/hotelbeds-client";
import {
  AmadeusClient,
  createAmadeusClient,
} from "@/features/integrations/providers/amadeus/amadeus-client";
import {
  TravelPayoutsClient,
  createTravelPayoutsClient,
} from "@/features/content-sync/providers/travelpayouts/travelpayouts-client";

/**
 * Per-tenant client factories. Each resolves the tenant's own credentials and
 * constructs a client bound to them (or reports the provider as not connected
 * for that tenant). Actions use these instead of importing a global client,
 * so there is no path by which one tenant can use another's account.
 */

type ClientResult<C> =
  | { ok: true; client: C; source: CredentialSource }
  | { ok: false; error: string };

const notConnected = (name: string): { ok: false; error: string } => ({
  ok: false,
  error: `${name} is not connected for this agency. Add credentials in Settings → Integrations.`,
});

export async function getDuffelClientForTenant(
  db: TenantDb,
  tenantId: string,
): Promise<ClientResult<DuffelClient>> {
  const resolved = await resolveTenantCredentials(db, tenantId, "DUFFEL");
  if (!resolved.configured || resolved.provider.type !== "DUFFEL") return notConnected("Duffel");
  return { ok: true, client: createDuffelClient(resolved.provider.credentials), source: resolved.source };
}

export async function getHotelbedsClientForTenant(
  db: TenantDb,
  tenantId: string,
): Promise<ClientResult<HotelbedsClient>> {
  const resolved = await resolveTenantCredentials(db, tenantId, "HOTELBEDS");
  if (!resolved.configured || resolved.provider.type !== "HOTELBEDS") {
    return notConnected("Hotelbeds");
  }
  return {
    ok: true,
    client: createHotelbedsClient(resolved.provider.credentials),
    source: resolved.source,
  };
}

export async function getAmadeusClientForTenant(
  db: TenantDb,
  tenantId: string,
): Promise<ClientResult<AmadeusClient>> {
  const resolved = await resolveTenantCredentials(db, tenantId, "AMADEUS");
  if (!resolved.configured || resolved.provider.type !== "AMADEUS") {
    return notConnected("Amadeus");
  }
  return {
    ok: true,
    client: createAmadeusClient(resolved.provider.credentials),
    source: resolved.source,
  };
}

export async function getTravelPayoutsClientForTenant(
  db: TenantDb,
  tenantId: string,
): Promise<ClientResult<TravelPayoutsClient>> {
  const resolved = await resolveTenantCredentials(db, tenantId, "TRAVELPAYOUTS");
  if (!resolved.configured || resolved.provider.type !== "TRAVELPAYOUTS") {
    return notConnected("TravelPayouts");
  }
  return {
    ok: true,
    client: createTravelPayoutsClient(resolved.provider.credentials),
    source: resolved.source,
  };
}
