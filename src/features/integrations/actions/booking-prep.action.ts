"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";
import { runIntegrationCall } from "@/features/integrations/lib/run-call";
import { getHotelbedsClientForTenant } from "@/features/integrations/lib/client-factory";
import {
  prepareHotelBookingSchema,
  type PrepareHotelBookingInput,
} from "@/features/integrations/schemas/integration.schema";
import { createBookingAction } from "@/features/bookings/actions/booking.action";
import { addBookingItemAction } from "@/features/bookings/actions/booking-item.action";

/**
 * Booking-flow preparation: turn a live Hotelbeds rate into a TravelOS draft
 * booking.
 *
 *   1. Re-validate price and availability against the REAL Hotelbeds API —
 *      the client-side amount from the search results is never trusted.
 *   2. Only then create the draft Booking + line item, storing the
 *      rechecked rate key on the line.
 *
 * Everything downstream (travellers, vouchers, cancellation) is the
 * existing booking machinery — no parallel flow is introduced. There is no
 * live purchase/order-execution step after this: the agency confirms the
 * booking with the supplier directly and records the outcome.
 */

export type PreparedBooking = {
  bookingId: string;
  /** The live-validated total the draft was created with. */
  validatedAmount: number;
  currency: string;
  /** Supplier-side validity horizon for the quoted price, when reported. */
  priceValidUntil: string | null;
};

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

  const validatedAmount = check.totalNet ?? rate.price;
  const currency = check.hotel.currency ?? rate.currency ?? "EUR";
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
      `, total ${currency} ${validatedAmount}` +
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
