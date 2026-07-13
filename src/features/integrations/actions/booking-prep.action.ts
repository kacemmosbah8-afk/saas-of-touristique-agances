"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";
import { runIntegrationCall } from "@/features/integrations/lib/run-call";
import {
  getDuffelClientForTenant,
  getHotelbedsClientForTenant,
} from "@/features/integrations/lib/client-factory";
import {
  prepareFlightBookingSchema,
  prepareHotelBookingSchema,
  type PrepareFlightBookingInput,
  type PrepareHotelBookingInput,
} from "@/features/integrations/schemas/integration.schema";
import { createBookingAction } from "@/features/bookings/actions/booking.action";
import { addBookingItemAction } from "@/features/bookings/actions/booking-item.action";
import { priceForProvider } from "@/features/pricing/lib/price";

/**
 * Booking-flow preparation: turn a live supplier result into a TravelOS draft
 * booking. Both actions follow the same non-negotiable sequence:
 *
 *   1. Re-validate price and availability against the REAL supplier API —
 *      the client-side amount from the search results is never trusted.
 *   2. Only then create the draft Booking + line item, storing the supplier
 *      reference (Duffel offer id / Hotelbeds rate key) on the line for the
 *      later order-creation step.
 *
 * Everything downstream (travellers, invoices, vouchers, cancellation) is the
 * existing booking machinery — no parallel flow is introduced.
 */

export type PreparedBooking = {
  bookingId: string;
  /** The live-validated total the draft was created with. */
  validatedAmount: number;
  currency: string;
  /** Supplier-side validity horizon for the quoted price, when reported. */
  priceValidUntil: string | null;
};

function isoDateOnly(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

export async function prepareFlightBookingAction(
  tenantId: string,
  input: PrepareFlightBookingInput,
): Promise<ActionResult<PreparedBooking>> {
  const { db } = await requirePermission(tenantId, "booking", "create");

  const parsed = prepareFlightBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const clientResult = await getDuffelClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  // Live re-price. Duffel rejects expired offers here, which is exactly the
  // guard we want before any booking is written.
  const repriced = await runIntegrationCall({
    db,
    tenantId,
    type: "DUFFEL",
    operation: "offer-revalidate",
    fn: () => clientResult.client.getOffer(d.offerId),
  });
  if (!repriced.ok) return repriced;
  const offer = repriced.data.result;

  // Universal Pricing Engine boundary — offer.totalAmount is Duffel's own
  // raw payable amount; validatedAmount (what gets charged and displayed)
  // is the tenant-priced figure. Never persist or display offer.totalAmount
  // directly past this point.
  const priced = await priceForProvider(db, "DUFFEL", offer.totalAmount, offer.currency);
  const validatedAmount = priced.sellingPrice;

  const firstSlice = offer.slices[0];
  const lastSlice = offer.slices[offer.slices.length - 1];
  const route = offer.slices.map((s) => `${s.origin}→${s.destination}`).join(", ");

  const created = await createBookingAction(tenantId, {
    customerId: d.customerId,
    adults: d.adults,
    children: d.children,
    currency: offer.currency,
    travelStartDate: isoDateOnly(firstSlice?.segments[0]?.departingAt),
    travelEndDate: isoDateOnly(
      lastSlice?.segments[lastSlice.segments.length - 1]?.arrivingAt,
    ),
    internalNotes:
      `Flight offer ${offer.id} validated live via Duffel. ` +
      `Supplier cost ${offer.currency} ${offer.totalAmount}, priced at ${offer.currency} ${validatedAmount}` +
      (offer.expiresAt ? `, offer valid until ${offer.expiresAt}.` : ".") +
      ` Passenger ids: ${offer.passengers.map((p) => p.id).join(", ")}.`,
  });
  if (!created.ok) return created;

  const description =
    `Flight ${route}` +
    (offer.ownerName ? ` · ${offer.ownerName}` : "") +
    ` · ${offer.passengerCount} pax`;

  const item = await addBookingItemAction(tenantId, created.data.bookingId, {
    type: "FLIGHT",
    description: description.slice(0, 300),
    referenceId: offer.id,
    quantity: 1,
    unitPrice: validatedAmount,
    supplierCost: offer.totalAmount,
    notes: offer.expiresAt ? `Offer expires ${offer.expiresAt}` : "",
  });
  if (!item.ok) {
    return {
      ok: false,
      error: `The flight line could not be added (${item.error}) — a draft booking was created without items; review it before retrying.`,
    };
  }

  logger.info("flight booking prepared from live offer", {
    tenantId,
    bookingId: created.data.bookingId,
    offerId: offer.id,
  });
  return {
    ok: true,
    data: {
      bookingId: created.data.bookingId,
      validatedAmount,
      currency: offer.currency,
      priceValidUntil: offer.expiresAt,
    },
  };
}

export async function prepareHotelBookingAction(
  tenantId: string,
  input: PrepareHotelBookingInput,
): Promise<ActionResult<PreparedBooking>> {
  const { db } = await requirePermission(tenantId, "booking", "create");

  const parsed = prepareHotelBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const clientResult = await getHotelbedsClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  // Live revalidation via checkrates — mandatory for RECHECK rates and the
  // authoritative price for all rates.
  const rechecked = await runIntegrationCall({
    db,
    tenantId,
    type: "HOTELBEDS",
    operation: "rate-check",
    fn: () => clientResult.client.checkRates(d.rateKey),
  });
  if (!rechecked.ok) return rechecked;

  const check = rechecked.data.result;
  const rate = check?.hotel.rates[0];
  if (!check || !rate) {
    return {
      ok: false,
      error: "This rate is no longer available. Search again for current availability.",
    };
  }

  // Universal Pricing Engine boundary — check.totalNet/rate.price is
  // Hotelbeds' own raw net (wholesale) rate; validatedAmount (what gets
  // charged and displayed) is the tenant-priced figure. Never persist or
  // display the raw net rate past this point.
  const supplierCost = check.totalNet ?? rate.price;
  const currency = check.hotel.currency ?? rate.currency ?? "EUR";
  const validatedAmount = (await priceForProvider(db, "HOTELBEDS", supplierCost, currency)).sellingPrice;
  const checkIn = check.checkIn ?? d.checkIn;
  const checkOut = check.checkOut ?? d.checkOut;

  const cancellation = rate.cancellationPolicies[0];
  const created = await createBookingAction(tenantId, {
    customerId: d.customerId,
    adults: d.adults,
    children: d.children,
    currency,
    travelStartDate: checkIn,
    travelEndDate: checkOut,
    internalNotes:
      `Hotel rate validated live via Hotelbeds checkrates. ` +
      `${check.hotel.name}, ${rate.roomName}` +
      (rate.boardName ? ` (${rate.boardName})` : "") +
      `, supplier cost ${currency} ${supplierCost}, priced at ${currency} ${validatedAmount}` +
      (rate.rateType ? `, rate type ${rate.rateType}` : "") +
      (rate.paymentType ? `, payment ${rate.paymentType}` : "") +
      (cancellation?.from
        ? `. Cancellation penalty ${currency} ${cancellation.amount ?? "?"} from ${cancellation.from}.`
        : "."),
  });
  if (!created.ok) return created;

  const description =
    `Hotel ${check.hotel.name} · ${rate.roomName}` +
    (rate.boardName ? ` · ${rate.boardName}` : "") +
    ` · ${checkIn} → ${checkOut}`;

  const item = await addBookingItemAction(tenantId, created.data.bookingId, {
    type: "HOTEL",
    description: description.slice(0, 300),
    // The rechecked rateKey supersedes the searched one and is what a future
    // Hotelbeds booking-confirmation call must use.
    referenceId: (rate.rateKey ?? d.rateKey).slice(0, 600),
    quantity: 1,
    unitPrice: validatedAmount,
    supplierCost,
    notes: rate.rateType === "RECHECK" ? "Rate was RECHECK — revalidated via checkrates." : "",
    supplierRateComments: rate.rateComments ?? "",
  });
  if (!item.ok) {
    return {
      ok: false,
      error: `The hotel line could not be added (${item.error}) — a draft booking was created without items; review it before retrying.`,
    };
  }

  logger.info("hotel booking prepared from live rate", {
    tenantId,
    bookingId: created.data.bookingId,
    hotelCode: check.hotel.code,
  });
  return {
    ok: true,
    data: {
      bookingId: created.data.bookingId,
      validatedAmount,
      currency,
      // Hotelbeds does not report a price-validity horizon; the rechecked
      // price holds until booked or availability changes.
      priceValidUntil: null,
    },
  };
}
