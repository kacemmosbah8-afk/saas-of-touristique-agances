import "server-only";

import type {
  InvoiceStatus,
  InvoiceActivityType,
  BookingItemType,
  PaymentMethod,
  PaymentKind,
  PaymentStatus,
  PaymentTransactionType,
  CreditNoteStatus,
  InstallmentStatus,
} from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";
import { computeBalance, type Balance } from "@/shared/lib/money";
import { isOverdue } from "@/features/invoices/lib/invoice-status";

export type InvoiceItemView = {
  id: string;
  type: BookingItemType;
  description: string;
  referenceId: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  notes: string | null;
  sortOrder: number;
};

export type InvoiceActivityView = {
  id: string;
  type: InvoiceActivityType;
  title: string;
  description: string | null;
  userId: string | null;
  createdAt: Date;
};

export type PaymentTransactionView = {
  id: string;
  type: PaymentTransactionType;
  amount: number;
  reference: string | null;
  notes: string | null;
  occurredAt: Date;
};

export type PaymentView = {
  id: string;
  reference: string;
  method: PaymentMethod;
  kind: PaymentKind;
  status: PaymentStatus;
  amount: number;
  refundedAmount: number;
  currency: string;
  receivedAt: Date;
  externalReference: string | null;
  notes: string | null;
  installmentId: string | null;
  transactions: PaymentTransactionView[];
};

export type CreditNoteView = {
  id: string;
  reference: string;
  status: CreditNoteStatus;
  amount: number;
  reason: string | null;
  issuedAt: Date;
  voidedAt: Date | null;
};

export type InstallmentView = {
  id: string;
  sequence: number;
  label: string;
  dueDate: Date;
  amount: number;
  status: InstallmentStatus;
  paidAt: Date | null;
};

export type InstallmentPlanView = {
  id: string;
  depositAmount: number;
  installmentCount: number;
  notes: string | null;
  installments: InstallmentView[];
};

export type InvoiceDetail = {
  id: string;
  reference: string;
  status: InvoiceStatus;
  customerId: string;
  customerName: string;
  bookingId: string | null;
  bookingReference: string | null;
  issuedAt: Date | null;
  dueDate: Date | null;
  paidAt: Date | null;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountRefunded: number;
  amountCredited: number;
  balance: Balance;
  overdue: boolean;
  notes: string | null;
  terms: string | null;
  internalNotes: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: InvoiceItemView[];
  activities: InvoiceActivityView[];
  payments: PaymentView[];
  creditNotes: CreditNoteView[];
  installmentPlan: InstallmentPlanView | null;
};

export async function getInvoice(
  db: TenantDb,
  tenantId: string,
  invoiceId: string,
): Promise<InvoiceDetail | null> {
  const invoice = await db.invoice.findFirst({
    // Explicit tenantId: single-record lookups are not auto-scoped (see db.ts).
    where: { id: invoiceId, tenantId, deletedAt: null },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      booking: { select: { reference: true } },
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
      payments: {
        orderBy: { receivedAt: "desc" },
        include: { transactions: { orderBy: { occurredAt: "asc" } } },
      },
      creditNotes: { orderBy: { issuedAt: "desc" } },
      installmentPlan: {
        include: { installments: { orderBy: { sequence: "asc" } } },
      },
    },
  });
  if (!invoice) return null;

  const total = toNumber(invoice.total) ?? 0;
  const amountPaid = toNumber(invoice.amountPaid) ?? 0;
  const amountRefunded = toNumber(invoice.amountRefunded) ?? 0;
  const amountCredited = toNumber(invoice.amountCredited) ?? 0;
  const balance = computeBalance({
    total,
    paid: amountPaid,
    refunded: amountRefunded,
    credited: amountCredited,
  });

  return {
    id: invoice.id,
    reference: invoice.reference,
    status: invoice.status,
    customerId: invoice.customerId,
    customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`.trim(),
    bookingId: invoice.bookingId,
    bookingReference: invoice.booking?.reference ?? null,
    issuedAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    currency: invoice.currency,
    subtotal: toNumber(invoice.subtotal) ?? 0,
    discount: toNumber(invoice.discount) ?? 0,
    tax: toNumber(invoice.tax) ?? 0,
    total,
    amountPaid,
    amountRefunded,
    amountCredited,
    balance,
    overdue: isOverdue(invoice.status, invoice.dueDate, balance.balanceDue),
    notes: invoice.notes,
    terms: invoice.terms,
    internalNotes: invoice.internalNotes,
    voidedAt: invoice.voidedAt,
    voidReason: invoice.voidReason,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    items: invoice.items.map((i) => ({
      id: i.id,
      type: i.type,
      description: i.description,
      referenceId: i.referenceId,
      quantity: i.quantity,
      unitPrice: toNumber(i.unitPrice) ?? 0,
      amount: toNumber(i.amount) ?? 0,
      notes: i.notes,
      sortOrder: i.sortOrder,
    })),
    activities: invoice.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      userId: a.userId,
      createdAt: a.createdAt,
    })),
    payments: invoice.payments.map((p) => ({
      id: p.id,
      reference: p.reference,
      method: p.method,
      kind: p.kind,
      status: p.status,
      amount: toNumber(p.amount) ?? 0,
      refundedAmount: toNumber(p.refundedAmount) ?? 0,
      currency: p.currency,
      receivedAt: p.receivedAt,
      externalReference: p.externalReference,
      notes: p.notes,
      installmentId: p.installmentId,
      transactions: p.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: toNumber(t.amount) ?? 0,
        reference: t.reference,
        notes: t.notes,
        occurredAt: t.occurredAt,
      })),
    })),
    creditNotes: invoice.creditNotes.map((n) => ({
      id: n.id,
      reference: n.reference,
      status: n.status,
      amount: toNumber(n.amount) ?? 0,
      reason: n.reason,
      issuedAt: n.issuedAt,
      voidedAt: n.voidedAt,
    })),
    installmentPlan: invoice.installmentPlan
      ? {
          id: invoice.installmentPlan.id,
          depositAmount: toNumber(invoice.installmentPlan.depositAmount) ?? 0,
          installmentCount: invoice.installmentPlan.installmentCount,
          notes: invoice.installmentPlan.notes,
          installments: invoice.installmentPlan.installments.map((i) => ({
            id: i.id,
            sequence: i.sequence,
            label: i.label,
            dueDate: i.dueDate,
            amount: toNumber(i.amount) ?? 0,
            status: i.status,
            paidAt: i.paidAt,
          })),
        }
      : null,
  };
}
