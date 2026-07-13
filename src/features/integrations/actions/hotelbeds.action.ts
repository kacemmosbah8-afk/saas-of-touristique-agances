"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { cached, cacheKey } from "@/features/integrations/lib/cache";
import { runIntegrationCall } from "@/features/integrations/lib/run-call";
import { getHotelbedsClientForTenant } from "@/features/integrations/lib/client-factory";
import { loadPricingContext, priceAmount } from "@/features/pricing/lib/price";
import type { PricingSettings } from "@/features/pricing/schemas/pricing.schema";
import type {
  ActivitySummaryDto,
  DestinationDto,
  HotelAvailabilityDto,
  HotelDetailDto,
  HotelRateCheckDto,
  TransferOptionDto,
} from "@/features/integrations/lib/dto";
import {
  placeQuerySchema,
  hotelAvailabilitySchema,
  hotelCodeSchema,
  rateKeySchema,
  activitySearchSchema,
  transferSearchSchema,
  type PlaceQueryInput,
  type HotelAvailabilityInput,
  type HotelCodeInput,
  type RateKeyInput,
  type ActivitySearchInput,
  type TransferSearchInput,
} from "@/features/integrations/schemas/integration.schema";
import type { ActionResult } from "@/shared/types/action-result";

const DESTINATION_TTL = 60 * 60 * 24 * 7; // destinations are near-static
const HOTEL_DETAIL_TTL = 60 * 60 * 24;
const AVAILABILITY_TTL = 60 * 10; // rates move
const ACTIVITY_TTL = 60 * 30;

/**
 * Universal Pricing Engine boundary — replaces every raw Hotelbeds `net`
 * rate with the tenant's priced selling amount before the DTO ever leaves
 * this action. Nothing downstream (the explorer UI, the confirmation
 * dialog) needs a pricing call of its own; the wholesale figure never
 * reaches the browser. Priced fresh on every call — not inside the cached
 * client response — so a tenant's pricing-settings change takes effect
 * immediately, without waiting out the availability cache TTL.
 */
function priceHotelAvailability(ctx: PricingSettings, hotels: HotelAvailabilityDto[]): HotelAvailabilityDto[] {
  return hotels.map((hotel) => {
    const rates = hotel.rates.map((rate) => ({
      ...rate,
      price: priceAmount(ctx, "HOTELBEDS", rate.price, rate.currency || hotel.currency || "").sellingPrice,
    }));
    return {
      ...hotel,
      minPrice: hotel.minPrice != null ? priceAmount(ctx, "HOTELBEDS", hotel.minPrice, hotel.currency ?? "").sellingPrice : null,
      rates,
    };
  });
}

export async function searchHotelbedsDestinationsAction(
  tenantId: string,
  input: PlaceQueryInput,
): Promise<ActionResult<{ result: DestinationDto[]; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const parsed = placeQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const clientResult = await getHotelbedsClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  const key = cacheKey("hotelbeds", tenantId, clientResult.client.environment, "destinations", parsed.data.query);
  return runIntegrationCall({
    db,
    tenantId,
    type: "HOTELBEDS",
    operation: "destination-search",
    fn: async () => {
      const { value } = await cached(key, DESTINATION_TTL, () =>
        clientResult.client.searchDestinations(parsed.data.query),
      );
      return value;
    },
  });
}

export async function searchHotelbedsAvailabilityAction(
  tenantId: string,
  input: HotelAvailabilityInput,
): Promise<ActionResult<{ result: HotelAvailabilityDto[]; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const parsed = hotelAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const clientResult = await getHotelbedsClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  const key = cacheKey(
    "hotelbeds",
    tenantId,
    clientResult.client.environment,
    "availability",
    d.destinationCode,
    d.checkIn,
    d.checkOut,
    d.adults,
    d.children,
    d.rooms,
  );

  return runIntegrationCall({
    db,
    tenantId,
    type: "HOTELBEDS",
    operation: "hotel-availability",
    fn: async () => {
      const { value } = await cached(key, AVAILABILITY_TTL, () =>
        clientResult.client.searchAvailability({
          destinationCode: d.destinationCode,
          checkIn: d.checkIn,
          checkOut: d.checkOut,
          adults: d.adults,
          children: d.children,
          rooms: d.rooms,
        }),
      );
      const pricingContext = await loadPricingContext(db);
      return priceHotelAvailability(pricingContext, value);
    },
  });
}

/**
 * Live rate revalidation (`checkrates`). Never cached — the whole point is a
 * real-time price/availability confirmation immediately before booking.
 */
export async function checkHotelbedsRatesAction(
  tenantId: string,
  input: RateKeyInput,
): Promise<ActionResult<{ result: HotelRateCheckDto | null; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const parsed = rateKeySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rate key." };
  }

  const clientResult = await getHotelbedsClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  return runIntegrationCall({
    db,
    tenantId,
    type: "HOTELBEDS",
    operation: "rate-check",
    fn: async () => {
      const check = await clientResult.client.checkRates(parsed.data.rateKey);
      if (!check) return check;
      const pricingContext = await loadPricingContext(db);
      const [pricedHotel] = priceHotelAvailability(pricingContext, [check.hotel]);
      return {
        ...check,
        hotel: pricedHotel,
        totalNet:
          check.totalNet != null
            ? priceAmount(pricingContext, "HOTELBEDS", check.totalNet, check.hotel.currency ?? "").sellingPrice
            : null,
      };
    },
  });
}

export async function getHotelbedsHotelDetailsAction(
  tenantId: string,
  input: HotelCodeInput,
): Promise<ActionResult<{ result: HotelDetailDto; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const parsed = hotelCodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid hotel code." };

  const clientResult = await getHotelbedsClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  const key = cacheKey("hotelbeds", tenantId, clientResult.client.environment, "hotel", parsed.data.code);
  return runIntegrationCall({
    db,
    tenantId,
    type: "HOTELBEDS",
    operation: "hotel-details",
    fn: async () => {
      const { value } = await cached(key, HOTEL_DETAIL_TTL, () =>
        clientResult.client.getHotelDetails(parsed.data.code),
      );
      return value;
    },
  });
}

export async function searchHotelbedsActivitiesAction(
  tenantId: string,
  input: ActivitySearchInput,
): Promise<ActionResult<{ result: ActivitySummaryDto[]; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const parsed = activitySearchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const clientResult = await getHotelbedsClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  const key = cacheKey("hotelbeds", tenantId, clientResult.client.environment, "activities", d.destinationCode, d.from, d.to);
  return runIntegrationCall({
    db,
    tenantId,
    type: "HOTELBEDS",
    operation: "activity-search",
    fn: async () => {
      const { value } = await cached(key, ACTIVITY_TTL, () =>
        clientResult.client.searchActivities(d.destinationCode, d.from, d.to),
      );
      return value;
    },
  });
}

export async function searchHotelbedsTransfersAction(
  tenantId: string,
  input: TransferSearchInput,
): Promise<ActionResult<{ result: TransferOptionDto[]; durationMs: number }>> {
  const { db } = await requirePermission(tenantId, "provider", "view");

  const parsed = transferSearchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const clientResult = await getHotelbedsClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  return runIntegrationCall({
    db,
    tenantId,
    type: "HOTELBEDS",
    operation: "transfer-search",
    fn: () =>
      clientResult.client.searchTransfers({
        fromType: d.fromType,
        fromCode: d.fromCode,
        toType: d.toType,
        toCode: d.toCode,
        outbound: `${d.outboundDate}T${d.outboundTime}:00`,
        adults: d.adults,
        children: d.children,
        infants: d.infants,
      }),
  });
}
