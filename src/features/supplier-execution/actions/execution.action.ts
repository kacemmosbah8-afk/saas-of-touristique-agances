"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import type { ActionResult } from "@/shared/types/action-result";
import { enqueueJob } from "@/features/automation/lib/engine";
import { SEND_COMMUNICATION_JOB_TYPE } from "@/features/automation/handlers/send-communication.handler";
import { RECONCILE_SUPPLIER_ORDER_JOB_TYPE } from "@/features/automation/handlers/reconcile-supplier-order.handler";
import {
  getDuffelClientForTenant,
  getHotelbedsClientForTenant,
} from "@/features/integrations/lib/client-factory";
import { createDuffelExecutionProvider } from "@/features/supplier-execution/providers/duffel/duffel-execution-provider";
import { createHotelbedsExecutionProvider } from "@/features/supplier-execution/providers/hotelbeds/hotelbeds-execution-provider";
import { claimAndExecute, claimAndCancel } from "@/features/supplier-execution/lib/engine";
import { reconcileSupplierOrder } from "@/features/supplier-execution/lib/reconciliation";
import { buildIdempotencyKey } from "@/features/supplier-execution/lib/idempotency";
import { CLAIMABLE_STATUSES } from "@/features/supplier-execution/lib/status";
import type {
  ExecutionRequest,
  PassengerInput,
  SupplierExecutionProvider,
} from "@/features/supplier-execution/lib/types";

type TenantDbFrom = Awaited<ReturnType<typeof requirePermission>>["db"];

/** The two BookingItem types with a real Supplier Execution path. Every
 * provider-specific branch in this file exists only to pick between these
 * two — the providers themselves hold all the rest of their own logic. */
type ExecutableItemType = "FLIGHT" | "HOTEL";

function isoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

type TravellerRow = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  gender: string;
  passportNumber: string | null;
  passportIssuingCountry: string | null;
  passportExpiry: Date | null;
  type: string;
  isPrimary: boolean;
};

function toPassengerInput(
  traveller: TravellerRow,
  providerPassengerId: string,
  fallbackEmail: string | null,
  fallbackPhone: string | null,
): PassengerInput {
  return {
    providerPassengerId,
    firstName: traveller.firstName,
    lastName: traveller.lastName,
    dateOfBirth: isoDate(traveller.dateOfBirth),
    gender: traveller.gender === "FEMALE" ? "FEMALE" : traveller.gender === "MALE" ? "MALE" : "UNSPECIFIED",
    email: fallbackEmail,
    phone: fallbackPhone,
    passportNumber: traveller.passportNumber,
    passportIssuingCountry: traveller.passportIssuingCountry,
    passportExpiry: isoDate(traveller.passportExpiry),
    travellerType: traveller.type === "CHILD" ? "CHILD" : traveller.type === "INFANT" ? "INFANT" : "ADULT",
    isPrimary: traveller.isPrimary,
  };
}

async function fetchTravellers(db: TenantDbFrom, tenantId: string, bookingId: string): Promise<TravellerRow[]> {
  return db.bookingTraveller.findMany({
    where: { bookingId, tenantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      passportNumber: true,
      passportIssuingCountry: true,
      passportExpiry: true,
      type: true,
      isPrimary: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchCustomerContact(
  db: TenantDbFrom,
  tenantId: string,
  bookingId: string,
): Promise<{ email: string | null; phone: string | null }> {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId },
    select: { customer: { select: { email: true, phone: true } } },
  });
  return { email: booking?.customer.email ?? null, phone: booking?.customer.phone ?? null };
}

type ExecutionInputs = {
  supplierOfferRef: string;
  passengers: PassengerInput[];
  commitMode: "HOLD" | "IMMEDIATE";
  currency: string;
  amount: number;
  provider: SupplierExecutionProvider;
};

/**
 * Re-fetches the Duffel offer live — never build a purchase request from a
 * cached price — and validates it still matches this booking's travellers.
 */
async function prepareFlightExecution(
  db: TenantDbFrom,
  tenantId: string,
  bookingId: string,
  offerId: string,
): Promise<{ ok: true; data: ExecutionInputs } | { ok: false; error: string }> {
  const clientResult = await getDuffelClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  let offer;
  try {
    offer = await clientResult.client.getOffer(offerId);
  } catch (err) {
    logger.warn("supplier execution: offer re-fetch failed", { tenantId, bookingId, error: String(err) });
    return { ok: false, error: "Could not re-validate this offer with Duffel. It may have expired." };
  }

  const travellers = await fetchTravellers(db, tenantId, bookingId);
  if (travellers.length !== offer.passengers.length) {
    return {
      ok: false,
      error: `This booking has ${travellers.length} traveller(s) but the offer was priced for ${offer.passengers.length}. Add or remove travellers to match before executing.`,
    };
  }

  const contact = await fetchCustomerContact(db, tenantId, bookingId);
  const passengers = travellers.map((t, i) =>
    toPassengerInput(t, offer.passengers[i].id, contact.email, contact.phone),
  );

  // Prefer a hold (nothing committed yet) whenever Duffel allows deferred
  // settlement on this offer; only fall back to an instant order.
  const commitMode: "HOLD" | "IMMEDIATE" = offer.paymentRequiredBy ? "HOLD" : "IMMEDIATE";

  return {
    ok: true,
    data: {
      supplierOfferRef: offer.id,
      passengers,
      commitMode,
      currency: offer.currency,
      amount: offer.totalAmount,
      provider: createDuffelExecutionProvider(clientResult.client),
    },
  };
}

/**
 * Re-checks the Hotelbeds rate live via `checkrates` — the rechecked
 * rateKey supersedes the searched one and must be what's actually booked —
 * and validates it still matches this booking's travellers. Hotelbeds has
 * no hold concept, so commitMode is always IMMEDIATE (see
 * `HotelbedsExecutionProvider`).
 */
async function prepareHotelExecution(
  db: TenantDbFrom,
  tenantId: string,
  bookingId: string,
  rateKey: string,
): Promise<{ ok: true; data: ExecutionInputs } | { ok: false; error: string }> {
  const clientResult = await getHotelbedsClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  let check;
  try {
    check = await clientResult.client.checkRates(rateKey);
  } catch (err) {
    logger.warn("supplier execution: rate re-check failed", { tenantId, bookingId, error: String(err) });
    return { ok: false, error: "Could not re-validate this rate with Hotelbeds. It may have expired." };
  }
  const rate = check?.hotel.rates[0];
  if (!check || !rate || !rate.rateKey) {
    return { ok: false, error: "This rate is no longer available. Search again for current pricing." };
  }

  const travellers = await fetchTravellers(db, tenantId, bookingId);
  const expectedOccupants = rate.adults + rate.children;
  if (travellers.length !== expectedOccupants) {
    return {
      ok: false,
      error: `This booking has ${travellers.length} traveller(s) but the rate was priced for ${expectedOccupants}. Add or remove travellers to match before executing.`,
    };
  }

  const contact = await fetchCustomerContact(db, tenantId, bookingId);
  // Hotelbeds has no provider-assigned passenger id on a rate — each
  // traveller's own row id stands in (unused by the provider either way).
  const passengers = travellers.map((t) => toPassengerInput(t, t.id, contact.email, contact.phone));

  return {
    ok: true,
    data: {
      supplierOfferRef: rate.rateKey,
      passengers,
      commitMode: "IMMEDIATE",
      currency: check.hotel.currency ?? rate.currency,
      amount: check.totalNet ?? rate.price,
      provider: createHotelbedsExecutionProvider(clientResult.client),
    },
  };
}

/**
 * The one unavoidable branch point: which provider applies to this booking
 * item. Everything past this call is generic — the engine, persistence, and
 * outcome handling below never look at `itemType` again.
 */
async function prepareExecution(
  db: TenantDbFrom,
  tenantId: string,
  bookingId: string,
  itemType: ExecutableItemType,
  supplierOfferRef: string,
): Promise<{ ok: true; data: ExecutionInputs } | { ok: false; error: string }> {
  return itemType === "HOTEL"
    ? prepareHotelExecution(db, tenantId, bookingId, supplierOfferRef)
    : prepareFlightExecution(db, tenantId, bookingId, supplierOfferRef);
}

/**
 * Loads everything execution needs, in one place, so both request and
 * retry build the identical `ExecutionRequest` from current data (never
 * stale — the offer/rate is re-fetched live, immediately before spending
 * any money, the same discipline `booking-prep.action.ts` established for
 * draft-booking creation).
 */
async function buildExecutionContext(
  db: TenantDbFrom,
  tenantId: string,
  bookingId: string,
  bookingItemId: string,
): Promise<
  | { ok: true; item: { id: string; type: ExecutableItemType; referenceId: string } }
  | { ok: false; error: string }
> {
  const item = await db.bookingItem.findFirst({
    where: { id: bookingItemId, bookingId, tenantId },
    select: { id: true, type: true, referenceId: true, booking: { select: { deletedAt: true, status: true } } },
  });
  if (!item || item.booking.deletedAt) return { ok: false, error: "Booking line not found." };
  if ((item.type !== "FLIGHT" && item.type !== "HOTEL") || !item.referenceId) {
    return {
      ok: false,
      error:
        "This line has no supplier offer to execute against (only flight lines from a live Duffel search or hotel lines from a live Hotelbeds search are supported).",
    };
  }
  if (item.booking.status === "CANCELLED") {
    return { ok: false, error: "A cancelled booking's lines can't be executed." };
  }

  return { ok: true, item: { id: item.id, type: item.type, referenceId: item.referenceId } };
}

export async function requestExecutionAction(
  tenantId: string,
  bookingId: string,
  bookingItemId: string,
): Promise<ActionResult<{ status: string }>> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const context = await buildExecutionContext(db, tenantId, bookingId, bookingItemId);
  if (!context.ok) return { ok: false, error: context.error };

  const prepared = await prepareExecution(db, tenantId, bookingId, context.item.type, context.item.referenceId);
  if (!prepared.ok) return { ok: false, error: prepared.error };

  const existing = await db.supplierOrder.findUnique({ where: { bookingItemId } });
  let supplierOrderId: string;
  if (existing) {
    if (!CLAIMABLE_STATUSES.includes(existing.status)) {
      return { ok: false, error: "This line already has an execution in progress or completed." };
    }
    supplierOrderId = existing.id;
  } else {
    // A concurrent double-click can race here: two requests both see "no
    // existing order" and both attempt to create one. The `bookingItemId`
    // unique constraint lets only one succeed — the loser re-fetches and
    // joins the winner's row rather than crashing. This does not risk a
    // double execution (only the winner ever reaches claimAndExecute
    // below); it's what keeps the loser's response clean instead of a raw
    // database error.
    try {
      const created = await db.supplierOrder.create({
        data: {
          tenantId,
          bookingId,
          bookingItemId,
          provider: context.item.type === "HOTEL" ? "HOTELBEDS" : "DUFFEL",
          idempotencyKey: buildIdempotencyKey(bookingItemId, 1),
          supplierOfferRef: prepared.data.supplierOfferRef,
          commitMode: prepared.data.commitMode,
          requestedBy: session.user.id,
        },
        select: { id: true },
      });
      supplierOrderId = created.id;
      await db.supplierOrderEvent.create({
        data: { tenantId, supplierOrderId, type: "REQUESTED", message: "Execution requested." },
      });
      await writeAudit(db, {
        userId: session.user.id,
        action: "execute_request",
        entity: "supplier_order",
        entityId: supplierOrderId,
        metadata: { bookingItemId },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const raced = await db.supplierOrder.findUnique({ where: { bookingItemId } });
        if (!raced || !CLAIMABLE_STATUSES.includes(raced.status)) {
          return { ok: false, error: "This line is already being executed — refresh to see its status." };
        }
        supplierOrderId = raced.id;
      } else {
        throw err;
      }
    }
  }

  const request: ExecutionRequest = {
    tenantId,
    supplierOrderId,
    supplierOfferRef: prepared.data.supplierOfferRef,
    passengers: prepared.data.passengers,
    commitMode: prepared.data.commitMode,
    currency: prepared.data.currency,
    amount: prepared.data.amount,
  };

  const outcome = await claimAndExecute(db, tenantId, supplierOrderId, prepared.data.provider, request);

  await onExecutionOutcome(db, tenantId, bookingId, bookingItemId, supplierOrderId, session.user.id, outcome);

  if (!outcome.ok) return { ok: false, error: outcome.error };
  return { ok: true, data: { status: outcome.status } };
}

export async function retryExecutionAction(
  tenantId: string,
  bookingId: string,
  bookingItemId: string,
): Promise<ActionResult<{ status: string }>> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const order = await db.supplierOrder.findFirst({
    where: { bookingItemId, bookingId, tenantId },
    select: { id: true, status: true, retryable: true, supplierOfferRef: true, provider: true },
  });
  if (!order) return { ok: false, error: "No execution found for this line." };
  if (order.status !== "SUPPLIER_FAILED" || order.retryable !== true) {
    return { ok: false, error: "This execution isn't retryable from its current state." };
  }

  const prepared = await prepareExecution(
    db,
    tenantId,
    bookingId,
    order.provider === "HOTELBEDS" ? "HOTEL" : "FLIGHT",
    order.supplierOfferRef,
  );
  if (!prepared.ok) return { ok: false, error: prepared.error };

  await db.supplierOrderEvent.create({
    data: { tenantId, supplierOrderId: order.id, type: "RETRY_REQUESTED", message: "Retry requested." },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "execute_retry",
    entity: "supplier_order",
    entityId: order.id,
  });

  const request: ExecutionRequest = {
    tenantId,
    supplierOrderId: order.id,
    supplierOfferRef: prepared.data.supplierOfferRef,
    passengers: prepared.data.passengers,
    commitMode: prepared.data.commitMode,
    currency: prepared.data.currency,
    amount: prepared.data.amount,
  };

  const outcome = await claimAndExecute(db, tenantId, order.id, prepared.data.provider, request);

  await onExecutionOutcome(db, tenantId, bookingId, bookingItemId, order.id, session.user.id, outcome);

  if (!outcome.ok) return { ok: false, error: outcome.error };
  return { ok: true, data: { status: outcome.status } };
}

/**
 * Builds a live, tenant-credentialed provider adapter from just the
 * provider enum on a SupplierOrder — shared by cancellation and by a
 * manual status check, since both need the same "get me a working client
 * for whichever supplier this order belongs to" step.
 */
async function resolveExecutionProvider(
  db: TenantDbFrom,
  tenantId: string,
  provider: "DUFFEL" | "HOTELBEDS",
): Promise<{ ok: true; provider: SupplierExecutionProvider } | { ok: false; error: string }> {
  if (provider === "HOTELBEDS") {
    const clientResult = await getHotelbedsClientForTenant(db, tenantId);
    if (!clientResult.ok) return { ok: false, error: clientResult.error };
    return { ok: true, provider: createHotelbedsExecutionProvider(clientResult.client) };
  }
  const clientResult = await getDuffelClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };
  return { ok: true, provider: createDuffelExecutionProvider(clientResult.client) };
}

export async function cancelExecutionAction(
  tenantId: string,
  bookingId: string,
  bookingItemId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "manage");

  const order = await db.supplierOrder.findFirst({
    where: { bookingItemId, bookingId, tenantId },
    select: { id: true, provider: true },
  });
  if (!order) return { ok: false, error: "No execution found for this line." };

  const providerResult = await resolveExecutionProvider(db, tenantId, order.provider);
  if (!providerResult.ok) return { ok: false, error: providerResult.error };

  const result = await claimAndCancel(db, tenantId, order.id, providerResult.provider);
  if (!result.ok) return { ok: false, error: result.error };

  await writeAudit(db, {
    userId: session.user.id,
    action: "execute_cancel",
    entity: "supplier_order",
    entityId: order.id,
  });
  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "NOTE",
      title: "Supplier order cancelled",
    },
  });

  return { ok: true };
}

/**
 * The Booking Status Resolution Capability's manual path — an agent who
 * doesn't want to wait for the next automatic check (the
 * `RECONCILE_SUPPLIER_ORDER` job, on the existing 5-minute cron) can ask
 * right now. Calls the exact same `reconcileSupplierOrder` the job handler
 * does, so a manual check and an automatic one can never disagree about
 * what "confirmed" means or duplicate a side effect.
 */
export async function checkSupplierOrderStatusAction(
  tenantId: string,
  bookingId: string,
  bookingItemId: string,
): Promise<ActionResult<{ status: string }>> {
  const { db } = await requirePermission(tenantId, "booking", "update");

  const order = await db.supplierOrder.findFirst({
    where: { bookingItemId, bookingId, tenantId },
    select: { id: true, status: true, provider: true },
  });
  if (!order) return { ok: false, error: "No execution found for this line." };
  if (order.status !== "AWAITING_SUPPLIER_CONFIRMATION") {
    return { ok: false, error: "This order isn't awaiting supplier confirmation." };
  }

  const providerResult = await resolveExecutionProvider(db, tenantId, order.provider);
  if (!providerResult.ok) return { ok: false, error: providerResult.error };

  const outcome = await reconcileSupplierOrder(db, tenantId, order.id, providerResult.provider);
  switch (outcome.outcome) {
    case "check_failed":
      return { ok: false, error: outcome.message };
    case "not_applicable":
      // Resolved already (a concurrent automatic check beat this one) —
      // not an error, just nothing further for this click to do.
      return { ok: true, data: { status: "resolved" } };
    case "still_awaiting":
      return { ok: true, data: { status: "AWAITING_SUPPLIER_CONFIRMATION" } };
    case "confirmed":
      return { ok: true, data: { status: "SUPPLIER_CONFIRMED" } };
    case "cancelled":
      return { ok: true, data: { status: "CANCELLED" } };
  }
}

/**
 * Shared follow-through after any execution attempt: update the linked
 * SupplierConfirmation (reused, not duplicated — see PROJECT.md), write a
 * BookingActivity entry, and notify. Runs for both fresh requests and
 * retries so neither path can drift from the other.
 */
async function onExecutionOutcome(
  db: TenantDbFrom,
  tenantId: string,
  bookingId: string,
  bookingItemId: string,
  supplierOrderId: string,
  userId: string,
  outcome: Awaited<ReturnType<typeof claimAndExecute>>,
): Promise<void> {
  // Hotelbeds "ON REQUEST" — accepted by the supplier but not yet a real
  // confirmation. This must NOT be treated the same as SUPPLIER_CONFIRMED
  // below (it previously was — marking SupplierConfirmation "CONFIRMED"
  // and emailing the customer a confirmed-booking notice before the
  // supplier had actually confirmed anything). Instead: note it plainly and
  // hand off to the Booking Status Resolution Capability, which checks back
  // until the supplier gives a real answer. Duffel never returns this
  // status, so this branch never runs for a Duffel order.
  if (outcome.ok && outcome.status === "AWAITING_SUPPLIER_CONFIRMATION") {
    const order = await db.supplierOrder.findFirst({
      where: { id: supplierOrderId, tenantId },
      select: { item: { select: { description: true } } },
    });
    await db.bookingActivity.create({
      data: {
        tenantId,
        bookingId,
        userId,
        type: "NOTE",
        title: `Awaiting supplier confirmation: ${order?.item.description ?? "booking line"}`,
        description:
          "Hotelbeds accepted the request ON REQUEST — TravelOS will check back automatically until the property responds.",
      },
    });
    // maxAttempts is generous, not indefinite: with the job engine's own
    // backoff capped at 30 minutes after a handful of attempts, 100
    // attempts sustains checking for many days — comfortably past any
    // realistic ON REQUEST resolution window — before dead-lettering and
    // leaving a human to look, the same "no automated way out forever"
    // precedent RECONCILIATION_REQUIRED already established.
    await enqueueJob({
      type: RECONCILE_SUPPLIER_ORDER_JOB_TYPE,
      tenantId,
      idempotencyKey: `reconcile_supplier_order:${supplierOrderId}`,
      maxAttempts: 100,
      payload: { tenantId, supplierOrderId },
    }).catch((err) => {
      logger.warn("supplier execution: could not enqueue reconciliation job", {
        tenantId,
        supplierOrderId,
        error: String(err),
      });
    });
    return;
  }

  if (outcome.ok) {
    const order = await db.supplierOrder.findFirst({
      where: { id: supplierOrderId, tenantId },
      select: {
        provider: true,
        confirmationNumber: true,
        item: { select: { description: true, type: true } },
        booking: { select: { customer: { select: { email: true, firstName: true, lastName: true } } } },
      },
    });
    if (order) {
      const supplierName = order.provider === "HOTELBEDS" ? "Hotelbeds" : "Duffel";
      const noun = order.item.type === "HOTEL" ? "hotel booking" : "flight";
      await db.supplierConfirmation.upsert({
        where: { bookingItemId },
        create: {
          tenantId,
          bookingId,
          bookingItemId,
          status: "CONFIRMED",
          supplierName,
          confirmationNumber: order.confirmationNumber,
          respondedAt: new Date(),
          createdBy: userId,
        },
        update: {
          status: "CONFIRMED",
          supplierName,
          confirmationNumber: order.confirmationNumber,
          respondedAt: new Date(),
        },
      });
      await db.bookingActivity.create({
        data: {
          tenantId,
          bookingId,
          userId,
          type: "NOTE",
          title: `Supplier order confirmed: ${order.item.description}`,
          description: `Confirmation #${order.confirmationNumber}`,
        },
      });
      if (order.booking.customer.email) {
        // Enqueued, not sent inline — the Platform Automation Capability's
        // first real consumer. Durable and retried on transient failure
        // instead of a single fire-and-forget attempt that silently drops
        // the notification (the previous behaviour here). A duplicate
        // execution outcome (a retry replaying this branch) joins the same
        // job row rather than sending twice.
        await enqueueJob({
          type: SEND_COMMUNICATION_JOB_TYPE,
          tenantId,
          idempotencyKey: `send_communication:supplier_order:${supplierOrderId}:confirmed`,
          payload: {
            tenantId,
            owner: { type: "supplier_order", id: supplierOrderId },
            to: order.booking.customer.email,
            subject: `Your ${noun} is confirmed — ${order.confirmationNumber}`,
            html: `<p>Your ${noun} has been confirmed with the supplier. Confirmation number: <strong>${order.confirmationNumber}</strong>.</p>`,
            text: `Your ${noun} has been confirmed with the supplier. Confirmation number: ${order.confirmationNumber}.`,
            sentByUserId: userId,
          },
        }).catch((err) => {
          // Never let a notification failure affect a real, already-confirmed order.
          logger.warn("supplier execution: could not enqueue confirmation email job", { tenantId, supplierOrderId, error: String(err) });
        });
      }
    }
  } else if (outcome.status === "SUPPLIER_FAILED") {
    await db.bookingActivity.create({
      data: {
        tenantId,
        bookingId,
        userId,
        type: "NOTE",
        title: "Supplier execution failed",
        description: outcome.error,
      },
    });
  } else if (outcome.status === "RECONCILIATION_REQUIRED") {
    logger.error("supplier execution: RECONCILIATION_REQUIRED surfaced to action layer", {
      tenantId,
      bookingId,
      bookingItemId,
      supplierOrderId,
    });
    await db.bookingActivity.create({
      data: {
        tenantId,
        bookingId,
        userId,
        type: "NOTE",
        title: "Supplier execution needs manual reconciliation",
        description: outcome.error,
      },
    });
  }
}
