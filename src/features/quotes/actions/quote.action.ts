"use server";

import type { QuoteStatus } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import { computeTotals } from "@/shared/lib/money";
import { toNumber } from "@/shared/lib/list-query";
import type { ActionResult } from "@/shared/types/action-result";
import {
  quoteFormSchema,
  updateQuoteStatusSchema,
  declineQuoteSchema,
  assignQuoteSchema,
  type QuoteFormInput,
  type UpdateQuoteStatusInput,
  type DeclineQuoteInput,
  type AssignQuoteInput,
} from "@/features/quotes/schemas/quote.schema";
import {
  canTransition,
  canConvert,
  QUOTE_STATUS_LABELS,
} from "@/features/quotes/lib/quote-status";
import { formatQuoteReference } from "@/features/quotes/lib/quote-reference";
import { recomputeQuoteTotals } from "@/features/quotes/lib/recompute-totals";
import { formatBookingReference } from "@/features/bookings/lib/reference";

type TenantDbFrom = Awaited<ReturnType<typeof requirePermission>>["db"];

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function headerData(d: QuoteFormInput) {
  return {
    packageId: emptyToNull(d.packageId),
    ownerId: emptyToNull(d.ownerId),
    validUntil: parseDate(d.validUntil || undefined),
    travelStartDate: parseDate(d.travelStartDate || undefined),
    travelEndDate: parseDate(d.travelEndDate || undefined),
    adults: d.adults,
    children: d.children,
    currency: d.currency,
    discount: d.discount ?? 0,
    tax: d.tax ?? 0,
    notes: emptyToNull(d.notes),
    terms: emptyToNull(d.terms),
    internalNotes: emptyToNull(d.internalNotes),
  };
}

/**
 * Allocate the next per-tenant quote reference. The sequence is the count of
 * existing quotes for the tenant in the current year + 1; the DB's
 * `@@unique([tenantId, reference])` is the final guard if two requests race.
 */
async function nextQuoteReference(db: TenantDbFrom, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await db.quote.count({
    where: { tenantId, createdAt: { gte: start, lt: end } },
  });
  return formatQuoteReference(year, count + 1);
}

async function nextBookingReference(db: TenantDbFrom, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await db.booking.count({
    where: { tenantId, createdAt: { gte: start, lt: end } },
  });
  return formatBookingReference(year, count + 1);
}

export async function createQuoteAction(
  tenantId: string,
  input: QuoteFormInput,
): Promise<ActionResult<{ quoteId: string }>> {
  const { session, db } = await requirePermission(tenantId, "quote", "create");

  const parsed = quoteFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return { ok: false, error: "Customer not found." };

  const data = headerData(parsed.data);
  if (data.packageId) {
    const pkg = await db.package.findFirst({
      where: { id: data.packageId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!pkg) return { ok: false, error: "Package not found." };
  }

  const totals = computeTotals({ items: [], discount: data.discount, tax: data.tax });
  const reference = await nextQuoteReference(db, tenantId);

  const quote = await db.quote.create({
    data: {
      tenantId,
      reference,
      customerId: parsed.data.customerId,
      ...data,
      subtotal: totals.subtotal,
      total: totals.total,
    },
    select: { id: true },
  });

  await db.quoteActivity.create({
    data: {
      tenantId,
      quoteId: quote.id,
      userId: session.user.id,
      type: "CREATED",
      title: `Quote ${reference} created`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "quote",
    entityId: quote.id,
    metadata: { reference },
  });
  logger.info("quote created", { tenantId, quoteId: quote.id, reference });
  return { ok: true, data: { quoteId: quote.id } };
}

export async function updateQuoteAction(
  tenantId: string,
  quoteId: string,
  input: QuoteFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "quote", "update");

  const parsed = quoteFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.quote.findFirst({
    where: { id: quoteId, tenantId, deletedAt: null },
    select: { id: true, customerId: true, status: true },
  });
  if (!existing) return { ok: false, error: "Quote not found." };
  if (existing.status === "CONVERTED") {
    return { ok: false, error: "A converted quote can no longer be edited." };
  }

  const data = headerData(parsed.data);
  if (data.packageId) {
    const pkg = await db.package.findFirst({
      where: { id: data.packageId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!pkg) return { ok: false, error: "Package not found." };
  }

  if (parsed.data.customerId !== existing.customerId) {
    const customer = await db.customer.findFirst({
      where: { id: parsed.data.customerId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) return { ok: false, error: "Customer not found." };
  }

  await db.quote.update({
    where: { id: quoteId, tenantId },
    data: { customerId: parsed.data.customerId, ...data },
  });
  await recomputeQuoteTotals(db, tenantId, quoteId);

  await db.quoteActivity.create({
    data: {
      tenantId,
      quoteId,
      userId: session.user.id,
      type: "UPDATED",
      title: "Quote details updated",
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "quote",
    entityId: quoteId,
  });
  return { ok: true };
}

/** Maps a status transition to the timestamp column it should stamp. */
function timestampFor(status: QuoteStatus): Record<string, Date> {
  switch (status) {
    case "SENT":
      return { sentAt: new Date() };
    case "ACCEPTED":
      return { acceptedAt: new Date() };
    default:
      return {};
  }
}

export async function updateQuoteStatusAction(
  tenantId: string,
  quoteId: string,
  input: UpdateQuoteStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "quote", "update");

  const parsed = updateQuoteStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };
  const next = parsed.data.status;

  // DECLINED and CONVERTED have dedicated actions (reason capture / booking
  // creation) — they are not manual targets here.
  if (next === "DECLINED") {
    return { ok: false, error: "Use the decline action to decline a quote." };
  }
  if (next === "CONVERTED") {
    return { ok: false, error: "Use the convert action to convert a quote." };
  }

  const quote = await db.quote.findFirst({
    where: { id: quoteId, tenantId, deletedAt: null },
    select: { status: true },
  });
  if (!quote) return { ok: false, error: "Quote not found." };
  if (quote.status === next) return { ok: true };

  if (!canTransition(quote.status, next)) {
    return {
      ok: false,
      error: `Cannot move a ${QUOTE_STATUS_LABELS[quote.status].toLowerCase()} quote to ${QUOTE_STATUS_LABELS[next].toLowerCase()}.`,
    };
  }

  await db.quote.update({
    where: { id: quoteId, tenantId },
    data: { status: next, ...timestampFor(next) },
  });

  await db.quoteActivity.create({
    data: {
      tenantId,
      quoteId,
      userId: session.user.id,
      type: next === "SENT" ? "SENT" : next === "ACCEPTED" ? "ACCEPTED" : "STATUS_CHANGED",
      title: `Status: ${QUOTE_STATUS_LABELS[quote.status]} → ${QUOTE_STATUS_LABELS[next]}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "status",
    entity: "quote",
    entityId: quoteId,
    metadata: { from: quote.status, to: next },
  });
  return { ok: true };
}

export async function declineQuoteAction(
  tenantId: string,
  quoteId: string,
  input: DeclineQuoteInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "quote", "update");

  const parsed = declineQuoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const quote = await db.quote.findFirst({
    where: { id: quoteId, tenantId, deletedAt: null },
    select: { status: true },
  });
  if (!quote) return { ok: false, error: "Quote not found." };
  if (quote.status === "DECLINED") return { ok: true };
  if (!canTransition(quote.status, "DECLINED")) {
    return { ok: false, error: "This quote can no longer be declined." };
  }

  const reason = emptyToNull(parsed.data.reason);
  await db.quote.update({
    where: { id: quoteId, tenantId },
    data: { status: "DECLINED", declinedAt: new Date() },
  });

  await db.quoteActivity.create({
    data: {
      tenantId,
      quoteId,
      userId: session.user.id,
      type: "DECLINED",
      title: "Quote declined",
      description: reason,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "decline",
    entity: "quote",
    entityId: quoteId,
  });
  logger.info("quote declined", { tenantId, quoteId });
  return { ok: true };
}

export async function assignQuoteAction(
  tenantId: string,
  quoteId: string,
  input: AssignQuoteInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "quote", "update");

  const parsed = assignQuoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const ownerId = emptyToNull(parsed.data.ownerId);
  if (ownerId) {
    const membership = await db.membership.findFirst({
      where: { userId: ownerId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!membership) return { ok: false, error: "Owner is not a member of this workspace." };
  }

  const existing = await db.quote.findFirst({
    where: { id: quoteId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Quote not found." };

  await db.quote.update({ where: { id: quoteId, tenantId }, data: { ownerId } });

  await db.quoteActivity.create({
    data: {
      tenantId,
      quoteId,
      userId: session.user.id,
      type: "ASSIGNED",
      title: ownerId ? "Quote assigned" : "Quote unassigned",
      metadata: { ownerId },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "assign",
    entity: "quote",
    entityId: quoteId,
    metadata: { ownerId },
  });
  return { ok: true };
}

export async function deleteQuoteAction(
  tenantId: string,
  quoteId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "quote", "delete");

  const existing = await db.quote.findFirst({
    where: { id: quoteId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Quote not found." };

  await db.quote.update({
    where: { id: quoteId, tenantId },
    data: { deletedAt: new Date() },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "quote",
    entityId: quoteId,
  });
  logger.info("quote deleted", { tenantId, quoteId });
  return { ok: true };
}

/**
 * Convert an ACCEPTED quote into a Booking. The quote's header + line items are
 * copied onto a new booking (with its own BK- reference); the quote is then
 * marked CONVERTED and linked to the booking via `convertedBookingId`. Creating
 * a booking requires the `booking:create` permission in addition to
 * `quote:update`, so both are checked. Idempotent: a quote already converted
 * returns its existing booking rather than creating a second one.
 */
export async function convertQuoteToBookingAction(
  tenantId: string,
  quoteId: string,
): Promise<ActionResult<{ bookingId: string }>> {
  const { session, db } = await requirePermission(tenantId, "booking", "create");
  // Also require quote:update — conversion mutates the quote's state.
  await requirePermission(tenantId, "quote", "update");

  const quote = await db.quote.findFirst({
    where: { id: quoteId, tenantId, deletedAt: null },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) return { ok: false, error: "Quote not found." };

  if (quote.status === "CONVERTED" && quote.convertedBookingId) {
    return { ok: true, data: { bookingId: quote.convertedBookingId } };
  }
  if (!canConvert(quote.status)) {
    return { ok: false, error: "Only an accepted quote can be converted to a booking." };
  }

  const reference = await nextBookingReference(db, tenantId);
  const booking = await db.booking.create({
    data: {
      tenantId,
      reference,
      customerId: quote.customerId,
      packageId: quote.packageId,
      ownerId: quote.ownerId,
      status: "CONFIRMED",
      confirmedAt: new Date(),
      travelStartDate: quote.travelStartDate,
      travelEndDate: quote.travelEndDate,
      adults: quote.adults,
      children: quote.children,
      currency: quote.currency,
      subtotal: toNumber(quote.subtotal) ?? 0,
      discount: toNumber(quote.discount) ?? 0,
      tax: toNumber(quote.tax) ?? 0,
      total: toNumber(quote.total) ?? 0,
      notes: quote.notes,
      internalNotes: quote.internalNotes,
    },
    select: { id: true },
  });

  if (quote.items.length > 0) {
    await db.bookingItem.createMany({
      data: quote.items.map((item) => ({
        tenantId,
        bookingId: booking.id,
        type: item.type,
        description: item.description,
        referenceId: item.referenceId,
        quantity: item.quantity,
        unitPrice: toNumber(item.unitPrice) ?? 0,
        amount: toNumber(item.amount) ?? 0,
        notes: item.notes,
        sortOrder: item.sortOrder,
      })),
    });
  }

  await db.quote.update({
    where: { id: quoteId, tenantId },
    data: {
      status: "CONVERTED",
      convertedAt: new Date(),
      convertedBookingId: booking.id,
    },
  });

  // Timeline entries on both sides so each record explains the link.
  await db.quoteActivity.create({
    data: {
      tenantId,
      quoteId,
      userId: session.user.id,
      type: "CONVERTED",
      title: `Converted to booking ${reference}`,
      metadata: { bookingId: booking.id, reference },
    },
  });
  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId: booking.id,
      userId: session.user.id,
      type: "CREATED",
      title: `Booking ${reference} created from quote ${quote.reference}`,
      metadata: { quoteId },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "convert",
    entity: "quote",
    entityId: quoteId,
    metadata: { bookingId: booking.id, reference },
  });
  logger.info("quote converted to booking", {
    tenantId,
    quoteId,
    bookingId: booking.id,
    reference,
  });
  return { ok: true, data: { bookingId: booking.id } };
}
