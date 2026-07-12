import type { InvoiceStatus, Prisma } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { paginate, pageMeta, toNumber } from "@/shared/lib/list-query";
import { computeBalance, sumAmounts } from "@/shared/lib/money";
import { isOverdue, OPEN_INVOICE_STATUSES } from "@/features/invoices/lib/invoice-status";
import type { ListInvoicesFilters } from "@/features/invoices/schemas/invoice.schema";

export type InvoiceSummary = {
  id: string;
  reference: string;
  status: InvoiceStatus;
  customerId: string;
  customerName: string;
  bookingId: string | null;
  bookingReference: string | null;
  issuedAt: Date | null;
  dueDate: Date | null;
  currency: string;
  total: number;
  balanceDue: number;
  overdue: boolean;
  createdAt: Date;
};

export type InvoiceListResult = {
  invoices: InvoiceSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const INVOICE_SELECT = {
  id: true,
  reference: true,
  status: true,
  customerId: true,
  bookingId: true,
  issuedAt: true,
  dueDate: true,
  currency: true,
  total: true,
  amountPaid: true,
  amountRefunded: true,
  amountCredited: true,
  createdAt: true,
  customer: { select: { firstName: true, lastName: true } },
  booking: { select: { reference: true } },
} as const;

type InvoiceRow = Prisma.InvoiceGetPayload<{ select: typeof INVOICE_SELECT }>;

function mapInvoice(inv: InvoiceRow): InvoiceSummary {
  const balance = computeBalance({
    total: toNumber(inv.total) ?? 0,
    paid: toNumber(inv.amountPaid) ?? 0,
    refunded: toNumber(inv.amountRefunded) ?? 0,
    credited: toNumber(inv.amountCredited) ?? 0,
  });
  return {
    id: inv.id,
    reference: inv.reference,
    status: inv.status,
    customerId: inv.customerId,
    customerName: `${inv.customer.firstName} ${inv.customer.lastName}`.trim(),
    bookingId: inv.bookingId,
    bookingReference: inv.booking?.reference ?? null,
    issuedAt: inv.issuedAt,
    dueDate: inv.dueDate,
    currency: inv.currency,
    total: toNumber(inv.total) ?? 0,
    balanceDue: balance.balanceDue,
    overdue: isOverdue(inv.status, inv.dueDate, balance.balanceDue),
    createdAt: inv.createdAt,
  };
}

function buildWhere(filters: ListInvoicesFilters): Prisma.InvoiceWhereInput {
  const { search, status, due } = filters;
  return {
    deletedAt: null,
    ...(status && status !== "all" ? { status } : {}),
    // "Overdue" narrows to open invoices past their due date; the residual
    // balance check happens after mapping (it needs the stored balance
    // columns), but open + past-due filters the page server-side first.
    ...(due === "overdue"
      ? { status: { in: [...OPEN_INVOICE_STATUSES] }, dueDate: { lt: new Date() } }
      : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search, mode: "insensitive" } },
            { customer: { firstName: { contains: search, mode: "insensitive" } } },
            { customer: { lastName: { contains: search, mode: "insensitive" } } },
            { booking: { reference: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function listInvoices(
  db: TenantDb,
  filters: ListInvoicesFilters = {},
): Promise<InvoiceListResult> {
  const { sort } = filters;
  const { page, skip, take } = paginate(filters.page);
  const where = buildWhere(filters);

  const orderBy: Prisma.InvoiceOrderByWithRelationInput =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "name_asc"
        ? { reference: "asc" }
        : sort === "name_desc"
          ? { reference: "desc" }
          : { createdAt: "desc" };

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({ where, select: INVOICE_SELECT, orderBy, skip, take }),
    db.invoice.count({ where }),
  ]);

  return { invoices: invoices.map(mapInvoice), ...pageMeta(total, page) };
}

export type InvoiceStats = {
  total: number;
  byStatus: Record<InvoiceStatus, number>;
  /** Sum of balance due across open invoices — what's still to collect. */
  outstanding: number;
  /** Open invoices already past their due date. */
  overdueCount: number;
  /** Net money collected (paid − refunded) across all non-void invoices. */
  collected: number;
};

/**
 * Headline stats for the invoices list. Balance figures are derived from the
 * stored money columns of the (bounded) open-invoice set — the same integer-
 * cents math the detail view uses, so the numbers always agree.
 */
export async function getInvoiceStats(db: TenantDb): Promise<InvoiceStats> {
  const [grouped, paidAgg, openInvoices] = await Promise.all([
    db.invoice.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    db.invoice.aggregate({
      where: { deletedAt: null, status: { not: "VOID" } },
      _sum: { amountPaid: true, amountRefunded: true },
    }),
    db.invoice.findMany({
      where: { deletedAt: null, status: { in: [...OPEN_INVOICE_STATUSES] } },
      select: {
        total: true,
        amountPaid: true,
        amountRefunded: true,
        amountCredited: true,
        dueDate: true,
        status: true,
      },
    }),
  ]);

  const byStatus = {
    DRAFT: 0,
    ISSUED: 0,
    PARTIALLY_PAID: 0,
    PAID: 0,
    VOID: 0,
  } as Record<InvoiceStatus, number>;
  let total = 0;
  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
    total += row._count._all;
  }

  let overdueCount = 0;
  const dues: number[] = [];
  for (const inv of openInvoices) {
    const balance = computeBalance({
      total: toNumber(inv.total) ?? 0,
      paid: toNumber(inv.amountPaid) ?? 0,
      refunded: toNumber(inv.amountRefunded) ?? 0,
      credited: toNumber(inv.amountCredited) ?? 0,
    });
    dues.push(balance.balanceDue);
    if (isOverdue(inv.status, inv.dueDate, balance.balanceDue)) overdueCount++;
  }

  const collected = sumAmounts([
    toNumber(paidAgg._sum.amountPaid) ?? 0,
    -(toNumber(paidAgg._sum.amountRefunded) ?? 0),
  ]);

  return {
    total,
    byStatus,
    outstanding: sumAmounts(dues),
    overdueCount,
    collected,
  };
}
