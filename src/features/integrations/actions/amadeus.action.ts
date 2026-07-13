"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { cached, cacheKey } from "@/features/integrations/lib/cache";
import { runIntegrationCall } from "@/features/integrations/lib/run-call";
import { getAmadeusClientForTenant } from "@/features/integrations/lib/client-factory";
import { loadPricingContext, priceAmount } from "@/features/pricing/lib/price";
import type { AirportDto, FlightOfferDto } from "@/features/integrations/lib/dto";
import {
  placeQuerySchema,
  flightSearchSchema,
  type PlaceQueryInput,
  type FlightSearchInput,
} from "@/features/integrations/schemas/integration.schema";
import type { ActionResult } from "@/shared/types/action-result";

const LOCATION_TTL = 60 * 60 * 24;
const OFFER_TTL = 60 * 5;

export async function searchAmadeusLocationsAction(
  tenantId: string,
  input: PlaceQueryInput,
): Promise<ActionResult<{ result: AirportDto[]; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const parsed = placeQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const clientResult = await getAmadeusClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  const key = cacheKey("amadeus", tenantId, "locations", parsed.data.query);
  return runIntegrationCall({
    db,
    tenantId,
    type: "AMADEUS",
    operation: "location-search",
    fn: async () => {
      const { value } = await cached(key, LOCATION_TTL, () =>
        clientResult.client.searchLocations(parsed.data.query),
      );
      return value;
    },
  });
}

export async function searchAmadeusFlightOffersAction(
  tenantId: string,
  input: FlightSearchInput,
): Promise<ActionResult<{ result: FlightOfferDto[]; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const parsed = flightSearchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const clientResult = await getAmadeusClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  const key = cacheKey(
    "amadeus",
    tenantId,
    "offers",
    d.origin,
    d.destination,
    d.departureDate,
    d.returnDate || "oneway",
    d.cabin,
    d.adults,
  );

  return runIntegrationCall({
    db,
    tenantId,
    type: "AMADEUS",
    operation: "flight-offer-search",
    fn: async () => {
      const { value } = await cached(key, OFFER_TTL, () =>
        clientResult.client.searchFlightOffers({
          origin: d.origin,
          destination: d.destination,
          departureDate: d.departureDate,
          returnDate: d.returnDate || undefined,
          cabin: d.cabin,
          passengers: { adults: d.adults, children: d.children, infants: d.infants },
        }),
      );
      // Universal Pricing Engine boundary — Amadeus has no booking flow yet
      // (search/comparison only), but its results are still customer-visible
      // and must never show a raw supplier amount either.
      const pricingContext = await loadPricingContext(db);
      return value.map((offer) => ({
        ...offer,
        totalAmount: priceAmount(pricingContext, "AMADEUS", offer.totalAmount, offer.currency).sellingPrice,
      }));
    },
  });
}
