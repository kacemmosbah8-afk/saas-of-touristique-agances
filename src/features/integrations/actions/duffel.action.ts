"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { cached, cacheKey } from "@/features/integrations/lib/cache";
import { runIntegrationCall } from "@/features/integrations/lib/run-call";
import { getDuffelClientForTenant } from "@/features/integrations/lib/client-factory";
import type {
  AirlineDto,
  AirportDto,
  FlightOfferDto,
} from "@/features/integrations/lib/dto";
import {
  placeQuerySchema,
  flightSearchSchema,
  offerIdSchema,
  type PlaceQueryInput,
  type FlightSearchInput,
  type OfferIdInput,
} from "@/features/integrations/schemas/integration.schema";
import type { ActionResult } from "@/shared/types/action-result";

const AIRPORT_TTL = 60 * 60 * 24; // 24h — airport data is near-static
const AIRLINE_TTL = 60 * 60 * 24;
const OFFER_SEARCH_TTL = 60 * 5; // 5m — fares move

export async function searchDuffelAirportsAction(
  tenantId: string,
  input: PlaceQueryInput,
): Promise<ActionResult<{ result: AirportDto[]; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const parsed = placeQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const clientResult = await getDuffelClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  const key = cacheKey("duffel", tenantId, "airports", parsed.data.query);
  return runIntegrationCall({
    db,
    tenantId,
    type: "DUFFEL",
    operation: "airport-search",
    fn: async () => {
      const { value } = await cached(key, AIRPORT_TTL, () =>
        clientResult.client.searchAirports(parsed.data.query),
      );
      return value;
    },
  });
}

export async function searchDuffelOffersAction(
  tenantId: string,
  input: FlightSearchInput,
): Promise<ActionResult<{ result: FlightOfferDto[]; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const parsed = flightSearchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const clientResult = await getDuffelClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  const key = cacheKey(
    "duffel",
    tenantId,
    "offers",
    d.origin,
    d.destination,
    d.departureDate,
    d.returnDate || "oneway",
    d.cabin,
    d.adults,
    d.children,
    d.infants,
  );

  return runIntegrationCall({
    db,
    tenantId,
    type: "DUFFEL",
    operation: "offer-search",
    fn: async () => {
      const { value } = await cached(key, OFFER_SEARCH_TTL, () =>
        clientResult.client.searchOffers({
          origin: d.origin,
          destination: d.destination,
          departureDate: d.departureDate,
          returnDate: d.returnDate || undefined,
          cabin: d.cabin,
          passengers: { adults: d.adults, children: d.children, infants: d.infants },
        }),
      );
      return value;
    },
  });
}

/** Re-fetches one offer live against Duffel — used by the explorer's
 * "Validate" button. Never caches; the whole point is a real-time revalidation. */
export async function getDuffelOfferAction(
  tenantId: string,
  input: OfferIdInput,
): Promise<ActionResult<{ result: FlightOfferDto; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const parsed = offerIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid offer id." };

  const clientResult = await getDuffelClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  return runIntegrationCall({
    db,
    tenantId,
    type: "DUFFEL",
    operation: "offer-details",
    fn: async () => {
      return clientResult.client.getOffer(parsed.data.offerId);
    },
  });
}

export async function listDuffelAirlinesAction(
  tenantId: string,
): Promise<ActionResult<{ result: AirlineDto[]; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const clientResult = await getDuffelClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  const key = cacheKey("duffel", tenantId, "airlines", "page1");
  return runIntegrationCall({
    db,
    tenantId,
    type: "DUFFEL",
    operation: "airline-list",
    fn: async () => {
      const { value } = await cached(key, AIRLINE_TTL, async () => {
        const { airlines } = await clientResult.client.listAirlines(60);
        return airlines;
      });
      return value;
    },
  });
}
