"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { prisma } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import { computeTotals, computeBalance } from "@/shared/lib/money";
import { toNumber } from "@/shared/lib/list-query";
import { sendEmail } from "@/shared/lib/email";
import { invoiceIssuedEmail } from "@/shared/lib/email/templates/invoice-issued";
import type { ActionResult } from "@/shared/types/action-result";
import {
  invoiceFormSchema,
  issueInvoiceSchema,
  voidInvoiceSchema,
  type InvoiceFormInput,
  type IssueInvoiceInput,
  type VoidInvoiceInput,
} from "@/features/invoices/schemas/invoice.schema";
import {
  canIssue,
  canVoid,
  canEditItems,
  INVOICE_STATUS_LABELS,
} from "@/features/invoices/lib/invoice-status";
import { formatInvoiceReference } from "@/features/invoices/lib/invoice-reference";
import { recomputeInvoiceTotals } from "@/features/invoices/lib/recompute-totals";

type TenantDbFrom = Awaited<ReturnType<typeof requirePermission>>["db"];

/**
 * Sends (or resends) the "invoice issued" email and records the outcome on
 * the invoice's own timeline. Best-effort by design: a failed or
 * not-configured send is logged and returned to the caller, never thrown —
 * invoice issuance is the source of truth and must not be blocked or
 * reversed by an email provider being down or unset (see Sprint X plan,
 * Milestone 1).
 */
async function sendInvoiceIssuedEmail(
  db: TenantDbFrom,
  tenantId: string,
  invoiceId: string,
  userId: string,
): Promise<{ sent: boolean; reason?: string }> {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId, deletedAt: null },
    select: {
      reference: true,
      total: true,
      currency: true,
      dueDate: true,
      customer: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!invoice) return { sent: false, reason: "invoice_not_found" };

  if (!invoice.customer.email) {
    logger.warn("invoice email skipped — customer has no email on file", {
      tenantId,
      invoiceId,
    });
    return { sent: false, reason: "no_customer_email" };
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });

  const { subject, html, text } = invoiceIssuedEmail({
    tenantName: tenant?.name ?? "Your travel agency",
    customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`.trim(),
    invoiceReference: invoice.reference,
    total: toNumber(invoice.total) ?? 0,
    currency: invoice.currency,
    dueDate: invoice.dueDate ?? new Date(),
  });

  const result = await sendEmail({ to: invoice.customer.email, subject, html, text });

  if (!result.ok) {
    logger.warn("invoice issued email not sent", {
      tenantId,
      invoiceId,
      reason: result.reason,
    });
    return { sent: false, reason: result.reason };
  }

  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId,
      userId,
      type: "EMAIL_SENT",
      title: `Invoice emailed to ${invoice.customer.email}`,
    },
  });
  logger.info("invoice issued email sent", { tenantId, invoiceId });
  return { sent: true };
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function headerData(d: InvoiceFormInput) {
  return {
    dueDate: parseDate(d.dueDate || undefined),
    currency: d.currency,
    discount: d.discount ?? 0,
    tax: d.tax ?? 0,
    notes: emptyToNull(d.notes),
    terms: emptyToNull(d.terms),
    internalNotes: emptyToNull(d.internalNotes),
  };
}

/**
 * Allocate the next per-tenant invoice reference. The sequence is the count
 * of existing invoices for the tenant in the current year + 1; the DB's
 * `@@unique([tenantId, reference])` is the final guard if two requests race.
 */
async function nextInvoiceReference(db: TenantDbFrom, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await db.invoice.count({
    where: { tenantId, createdAt: { gte: start, lt: end } },
  });
  return formatInvoiceReference(year, count + 1);
}

export async function createInvoiceAction(
  tenantId: string,
  input: InvoiceFormInput,
): Promise<ActionResult<{ invoiceId: string }>> {
  const { session, db } = await requirePermission(tenantId, "invoice", "create");

  const parsed = invoiceFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) return { ok: false, error: "Customer not found." };

  const bookingId = emptyToNull(parsed.data.bookingId);
  if (bookingId) {
    const booking = await db.booking.findFirst({
      where: { id: bookingId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!booking) return { ok: false, error: "Booking not found." };
  }

  const data = headerData(parsed.data);
  const totals = computeTotals({ items: [], discount: data.discount, tax: data.tax });
  const reference = await nextInvoiceReference(db, tenantId);

  const invoice = await db.invoice.create({
    data: {
      tenantId,
      reference,
      customerId: parsed.data.customerId,
      bookingId,
      ...data,
      subtotal: totals.subtotal,
      total: totals.total,
    },
    select: { id: true },
  });

  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId: invoice.id,
      userId: session.user.id,
      type: "CREATED",
      title: `Invoice ${reference} created`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "invoice",
    entityId: invoice.id,
    metadata: { reference },
  });
  logger.info("invoice created", { tenantId, invoiceId: invoice.id, reference });
  return { ok: true, data: { invoiceId: invoice.id } };
}

/**
 * Generate a DRAFT invoice from a booking: header + line items are copied
 * (the same direct-copy discipline as quote→booking conversion — InvoiceItem
 * reuses BookingItemType). The invoice stays a draft so lines can still be
 * adjusted (e.g. split into a deposit invoice) before issuing. A booking may
 * legitimately have several invoices, so this is not idempotent by design —
 * the UI shows the booking's existing invoices next to the generate button.
 */
export async function generateInvoiceFromBookingAction(
  tenantId: string,
  bookingId: string,
): Promise<ActionResult<{ invoiceId: string }>> {
  const { session, db } = await requirePermission(tenantId, "invoice", "create");

  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId, deletedAt: null },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status === "CANCELLED") {
    return { ok: false, error: "A cancelled booking can't be invoiced." };
  }

  const reference = await nextInvoiceReference(db, tenantId);
  const invoice = await db.invoice.create({
    data: {
      tenantId,
      reference,
      customerId: booking.customerId,
      bookingId: booking.id,
      currency: booking.currency,
      subtotal: toNumber(booking.subtotal) ?? 0,
      discount: toNumber(booking.discount) ?? 0,
      tax: toNumber(booking.tax) ?? 0,
      total: toNumber(booking.total) ?? 0,
      notes: booking.notes,
    },
    select: { id: true },
  });

  if (booking.items.length > 0) {
    await db.invoiceItem.createMany({
      data: booking.items.map((item) => ({
        tenantId,
        invoiceId: invoice.id,
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

  // Timeline entries on both sides so each record explains the link.
  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId: invoice.id,
      userId: session.user.id,
      type: "CREATED",
      title: `Invoice ${reference} generated from booking ${booking.reference}`,
      metadata: { bookingId: booking.id },
    },
  });
  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId: booking.id,
      userId: session.user.id,
      type: "NOTE",
      title: `Invoice ${reference} generated`,
      metadata: { invoiceId: invoice.id, reference },
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "generate",
    entity: "invoice",
    entityId: invoice.id,
    metadata: { bookingId: booking.id, reference },
  });
  logger.info("invoice generated from booking", {
    tenantId,
    invoiceId: invoice.id,
    bookingId: booking.id,
    reference,
  });
  return { ok: true, data: { invoiceId: invoice.id } };
}

export async function updateInvoiceAction(
  tenantId: string,
  invoiceId: string,
  input: InvoiceFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "invoice", "update");

  const parsed = invoiceFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId, deletedAt: null },
    select: { id: true, customerId: true, status: true },
  });
  if (!existing) return { ok: false, error: "Invoice not found." };
  if (!canEditItems(existing.status)) {
    return {
      ok: false,
      error: `A ${INVOICE_STATUS_LABELS[existing.status].toLowerCase()} invoice's details can't be edited.`,
    };
  }

  const bookingId = emptyToNull(parsed.data.bookingId);
  if (bookingId) {
    const booking = await db.booking.findFirst({
      where: { id: bookingId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!booking) return { ok: false, error: "Booking not found." };
  }

  if (parsed.data.customerId !== existing.customerId) {
    const customer = await db.customer.findFirst({
      where: { id: parsed.data.customerId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) return { ok: false, error: "Customer not found." };
  }

  await db.invoice.update({
    where: { id: invoiceId, tenantId },
    data: { customerId: parsed.data.customerId, bookingId, ...headerData(parsed.data) },
  });
  await recomputeInvoiceTotals(db, tenantId, invoiceId);

  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId,
      userId: session.user.id,
      type: "UPDATED",
      title: "Invoice details updated",
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "invoice",
    entityId: invoiceId,
  });
  return { ok: true };
}

/**
 * Issue a draft: locks the line items and starts collection. Requires at
 * least one line and a positive total — an empty bill is not collectable —
 * plus a due date (captured here, not at draft time).
 */
export async function issueInvoiceAction(
  tenantId: string,
  invoiceId: string,
  input: IssueInvoiceInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "invoice", "update");

  const parsed = issueInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId, deletedAt: null },
    select: { status: true, total: true, reference: true, _count: { select: { items: true } } },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (!canIssue(invoice.status)) {
    return {
      ok: false,
      error: `A ${INVOICE_STATUS_LABELS[invoice.status].toLowerCase()} invoice can't be issued.`,
    };
  }
  if (invoice._count.items === 0) {
    return { ok: false, error: "Add at least one line item before issuing." };
  }
  if ((toNumber(invoice.total) ?? 0) <= 0) {
    return { ok: false, error: "The invoice total must be positive to issue." };
  }

  await db.invoice.update({
    where: { id: invoiceId, tenantId },
    data: {
      status: "ISSUED",
      issuedAt: new Date(),
      dueDate: new Date(parsed.data.dueDate),
    },
  });

  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId,
      userId: session.user.id,
      type: "ISSUED",
      title: `Invoice ${invoice.reference} issued`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "issue",
    entity: "invoice",
    entityId: invoiceId,
  });
  logger.info("invoice issued", { tenantId, invoiceId });

  await sendInvoiceIssuedEmail(db, tenantId, invoiceId, session.user.id);

  return { ok: true };
}

/**
 * Manually (re-)send the "invoice issued" email — for when the automatic
 * send at issue-time failed (no provider configured, transient failure) or
 * the customer's address changed and needs a fresh copy.
 */
export async function resendInvoiceEmailAction(
  tenantId: string,
  invoiceId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "invoice", "update");

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId, deletedAt: null },
    select: { status: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "DRAFT") {
    return { ok: false, error: "Issue the invoice before sending it to the customer." };
  }

  const result = await sendInvoiceIssuedEmail(db, tenantId, invoiceId, session.user.id);
  if (!result.sent) {
    const reasonMessage: Record<string, string> = {
      no_customer_email: "This customer has no email address on file.",
      not_configured: "Email sending isn't configured for this workspace yet.",
      no_recipient: "This customer has no email address on file.",
      provider_error: "The email provider rejected the send — try again shortly.",
      invoice_not_found: "Invoice not found.",
    };
    return {
      ok: false,
      error: reasonMessage[result.reason ?? ""] ?? "Could not send the email.",
    };
  }

  return { ok: true };
}

/**
 * Void an open invoice. Money already collected must be refunded first —
 * voiding is only allowed when nothing is net-paid, so the record can be
 * cancelled without erasing a real cash position.
 */
export async function voidInvoiceAction(
  tenantId: string,
  invoiceId: string,
  input: VoidInvoiceInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "invoice", "manage");

  const parsed = voidInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId, deletedAt: null },
    select: {
      status: true,
      total: true,
      amountPaid: true,
      amountRefunded: true,
      amountCredited: true,
    },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (!canVoid(invoice.status)) {
    return {
      ok: false,
      error: `A ${INVOICE_STATUS_LABELS[invoice.status].toLowerCase()} invoice can't be voided.`,
    };
  }

  const balance = computeBalance({
    total: toNumber(invoice.total) ?? 0,
    paid: toNumber(invoice.amountPaid) ?? 0,
    refunded: toNumber(invoice.amountRefunded) ?? 0,
    credited: toNumber(invoice.amountCredited) ?? 0,
  });
  if (balance.netPaid > 0) {
    return {
      ok: false,
      error: "Refund the recorded payments before voiding this invoice.",
    };
  }

  await db.invoice.update({
    where: { id: invoiceId, tenantId },
    data: {
      status: "VOID",
      voidedAt: new Date(),
      voidReason: parsed.data.reason,
    },
  });

  await db.invoiceActivity.create({
    data: {
      tenantId,
      invoiceId,
      userId: session.user.id,
      type: "VOIDED",
      title: "Invoice voided",
      description: parsed.data.reason,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "void",
    entity: "invoice",
    entityId: invoiceId,
    metadata: { reason: parsed.data.reason },
  });
  logger.info("invoice voided", { tenantId, invoiceId });
  return { ok: true };
}

/**
 * Soft-delete a DRAFT. Issued invoices are financial records — they are
 * voided (kept, marked cancelled), never deleted.
 */
export async function deleteInvoiceAction(
  tenantId: string,
  invoiceId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "invoice", "delete");

  const existing = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Invoice not found." };
  if (existing.status !== "DRAFT") {
    return { ok: false, error: "Only a draft can be deleted — void the invoice instead." };
  }

  await db.invoice.update({
    where: { id: invoiceId, tenantId },
    data: { deletedAt: new Date() },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "invoice",
    entityId: invoiceId,
  });
  logger.info("invoice deleted", { tenantId, invoiceId });
  return { ok: true };
}
