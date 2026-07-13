"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { can } from "@/shared/lib/permissions/permissions";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { computeBalance } from "@/shared/lib/money";
import { toNumber } from "@/shared/lib/list-query";
import type { ActionResult } from "@/shared/types/action-result";
import { enqueueJob } from "@/features/automation/lib/engine";
import { SEND_COMMUNICATION_JOB_TYPE } from "@/features/automation/handlers/send-communication.handler";
import { getDuffelClientForTenant } from "@/features/integrations/lib/client-factory";
import { createDuffelExecutionProvider } from "@/features/supplier-execution/providers/duffel/duffel-execution-provider";
import { claimAndExecute, claimAndCancel } from "@/features/supplier-execution/lib/engine";
import { buildIdempotencyKey } from "@/features/supplier-execution/lib/idempotency";
import { CLAIMABLE_STATUSES } from "@/features/supplier-execution/lib/status";
import type { ExecutionRequest, PassengerInput } from "@/features/supplier-execution/lib/types";
import {
  requestExecutionSchema,
  type RequestExecutionInput,
} from "@/features/supplier-execution/schemas/execution.schema";

type TenantDbFrom = Awaited<ReturnType<typeof requirePermission>>["db"];

function isoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function toPassengerInput(
  traveller: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    gender: string;
    passportNumber: string | null;
    passportIssuingCountry: string | null;
    passportExpiry: Date | null;
  },
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
  };
}

/**
 * Loads everything execution needs, in one place, so both request and
 * retry build the identical `ExecutionRequest` from current data (never
 * stale — the offer is re-fetched from Duffel live, immediately before
 * spending any money, the same discipline `booking-prep.action.ts`
 * established for draft-booking creation).
 */
async function buildExecutionContext(
  db: TenantDbFrom,
  tenantId: string,
  bookingId: string,
  bookingItemId: string,
): Promise<
  | { ok: true; item: { id: string; type: string; referenceId: string | null }; settled: boolean }
  | { ok: false; error: string }
> {
  const item = await db.bookingItem.findFirst({
    where: { id: bookingItemId, bookingId, tenantId },
    select: { id: true, type: true, referenceId: true, booking: { select: { deletedAt: true, status: true } } },
  });
  if (!item || item.booking.deletedAt) return { ok: false, error: "Booking line not found." };
  if (item.type !== "FLIGHT" || !item.referenceId) {
    return {
      ok: false,
      error: "This line has no supplier offer to execute against (only Duffel flight lines from a live search are supported).",
    };
  }
  if (item.booking.status === "CANCELLED") {
    return { ok: false, error: "A cancelled booking's lines can't be executed." };
  }

  const invoices = await db.invoice.findMany({
    where: { bookingId, tenantId, deletedAt: null, status: { not: "VOID" } },
    select: { total: true, amountPaid: true, amountRefunded: true, amountCredited: true },
  });
  const settled =
    invoices.length > 0 &&
    invoices.every((inv) => {
      const balance = computeBalance({
        total: toNumber(inv.total) ?? 0,
        paid: toNumber(inv.amountPaid) ?? 0,
        refunded: toNumber(inv.amountRefunded) ?? 0,
        credited: toNumber(inv.amountCredited) ?? 0,
      });
      return balance.settled;
    });

  return { ok: true, item: { id: item.id, type: item.type, referenceId: item.referenceId }, settled };
}

export async function requestExecutionAction(
  tenantId: string,
  bookingId: string,
  bookingItemId: string,
  input: RequestExecutionInput,
): Promise<ActionResult<{ status: string }>> {
  const { session, db, membership } = await requirePermission(tenantId, "booking", "update");

  const parsed = requestExecutionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const context = await buildExecutionContext(db, tenantId, bookingId, bookingItemId);
  if (!context.ok) return { ok: false, error: context.error };

  if (!context.settled) {
    if (!parsed.data.overridePayment) {
      return {
        ok: false,
        error:
          "This booking's invoices aren't fully paid yet. A manager can override and execute anyway if the agency has decided to book first.",
      };
    }
    if (!can(membership.role, "booking", "manage")) {
      return { ok: false, error: "Only an owner or admin can execute against an unpaid booking." };
    }
  }

  const clientResult = await getDuffelClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  // Re-fetch the offer live — the offer id is stale the instant it leaves
  // Duffel's servers; never build a purchase request from a cached price.
  let offer;
  try {
    offer = await clientResult.client.getOffer(context.item.referenceId!);
  } catch (err) {
    logger.warn("supplier execution: offer re-fetch failed", { tenantId, bookingItemId, error: String(err) });
    return { ok: false, error: "Could not re-validate this offer with Duffel. It may have expired." };
  }

  const travellers = await db.bookingTraveller.findMany({
    where: { bookingId, tenantId },
    select: {
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      passportNumber: true,
      passportIssuingCountry: true,
      passportExpiry: true,
    },
    orderBy: { createdAt: "asc" },
  });
  if (travellers.length !== offer.passengers.length) {
    return {
      ok: false,
      error: `This booking has ${travellers.length} traveller(s) but the offer was priced for ${offer.passengers.length}. Add or remove travellers to match before executing.`,
    };
  }

  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId },
    select: { customer: { select: { email: true, phone: true, firstName: true, lastName: true } } },
  });

  const passengers: PassengerInput[] = travellers.map((t, i) =>
    toPassengerInput(t, offer.passengers[i].id, booking?.customer.email ?? null, booking?.customer.phone ?? null),
  );

  // Prefer a hold (no money moves) whenever Duffel allows deferred payment
  // on this offer; only fall back to an instant, balance-paid purchase.
  const paymentMode: "HOLD" | "BALANCE" = offer.paymentRequiredBy ? "HOLD" : "BALANCE";

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
          provider: "DUFFEL",
          idempotencyKey: buildIdempotencyKey(bookingItemId, 1),
          supplierOfferRef: offer.id,
          paymentMode,
          requestedBy: session.user.id,
          paidOverride: !context.settled,
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
        metadata: { bookingItemId, paidOverride: !context.settled },
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
    supplierOfferRef: offer.id,
    passengers,
    paymentMode,
    currency: offer.currency,
    amount: offer.totalAmount,
  };

  const outcome = await claimAndExecute(
    db,
    tenantId,
    supplierOrderId,
    createDuffelExecutionProvider(clientResult.client),
    request,
  );

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
    select: { id: true, status: true, retryable: true, supplierOfferRef: true, paymentMode: true },
  });
  if (!order) return { ok: false, error: "No execution found for this line." };
  if (order.status !== "SUPPLIER_FAILED" || order.retryable !== true) {
    return { ok: false, error: "This execution isn't retryable from its current state." };
  }

  const clientResult = await getDuffelClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  let offer;
  try {
    offer = await clientResult.client.getOffer(order.supplierOfferRef);
  } catch {
    return { ok: false, error: "Could not re-validate this offer with Duffel. It may have expired." };
  }

  const travellers = await db.bookingTraveller.findMany({
    where: { bookingId, tenantId },
    select: {
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
      passportNumber: true,
      passportIssuingCountry: true,
      passportExpiry: true,
    },
    orderBy: { createdAt: "asc" },
  });
  if (travellers.length !== offer.passengers.length) {
    return { ok: false, error: "Traveller count no longer matches the offer — check the booking's travellers." };
  }
  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId },
    select: { customer: { select: { email: true, phone: true } } },
  });
  const passengers: PassengerInput[] = travellers.map((t, i) =>
    toPassengerInput(t, offer.passengers[i].id, booking?.customer.email ?? null, booking?.customer.phone ?? null),
  );

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
    supplierOfferRef: offer.id,
    passengers,
    paymentMode: order.paymentMode,
    currency: offer.currency,
    amount: offer.totalAmount,
  };

  const outcome = await claimAndExecute(
    db,
    tenantId,
    order.id,
    createDuffelExecutionProvider(clientResult.client),
    request,
  );

  await onExecutionOutcome(db, tenantId, bookingId, bookingItemId, order.id, session.user.id, outcome);

  if (!outcome.ok) return { ok: false, error: outcome.error };
  return { ok: true, data: { status: outcome.status } };
}

export async function cancelExecutionAction(
  tenantId: string,
  bookingId: string,
  bookingItemId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "manage");

  const order = await db.supplierOrder.findFirst({
    where: { bookingItemId, bookingId, tenantId },
    select: { id: true },
  });
  if (!order) return { ok: false, error: "No execution found for this line." };

  const clientResult = await getDuffelClientForTenant(db, tenantId);
  if (!clientResult.ok) return { ok: false, error: clientResult.error };

  const result = await claimAndCancel(
    db,
    tenantId,
    order.id,
    createDuffelExecutionProvider(clientResult.client),
  );
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
  if (outcome.ok) {
    const order = await db.supplierOrder.findFirst({
      where: { id: supplierOrderId, tenantId },
      select: {
        confirmationNumber: true,
        item: { select: { description: true } },
        booking: { select: { customer: { select: { email: true, firstName: true, lastName: true } } } },
      },
    });
    if (order) {
      await db.supplierConfirmation.upsert({
        where: { bookingItemId },
        create: {
          tenantId,
          bookingId,
          bookingItemId,
          status: "CONFIRMED",
          supplierName: "Duffel",
          confirmationNumber: order.confirmationNumber,
          respondedAt: new Date(),
          createdBy: userId,
        },
        update: {
          status: "CONFIRMED",
          supplierName: "Duffel",
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
            subject: `Your flight is confirmed — ${order.confirmationNumber}`,
            html: `<p>Your flight has been confirmed with the airline. Confirmation number: <strong>${order.confirmationNumber}</strong>.</p>`,
            text: `Your flight has been confirmed with the airline. Confirmation number: ${order.confirmationNumber}.`,
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
