"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { cached, cacheKey } from "@/features/integrations/lib/cache";
import { runIntegrationCall } from "@/features/integrations/lib/run-call";
import { amadeusClient } from "@/features/integrations/providers/amadeus/amadeus-client";
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
  if (!amadeusClient.isConfigured()) {
    return { ok: false, error: "Amadeus is awaiting credentials." };
  }

  const key = cacheKey("amadeus", "locations", parsed.data.query);
  return runIntegrationCall({
    db,
    tenantId,
    type: "AMADEUS",
    operation: "location-search",
    fn: async () => {
      const { value } = await cached(key, LOCATION_TTL, () =>
        amadeusClient.searchLocations(parsed.data.query),
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
  if (!amadeusClient.isConfigured()) {
    return { ok: false, error: "Amadeus is awaiting credentials." };
  }
  const d = parsed.data;

  const key = cacheKey(
    "amadeus",
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
        amadeusClient.searchFlightOffers({
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
