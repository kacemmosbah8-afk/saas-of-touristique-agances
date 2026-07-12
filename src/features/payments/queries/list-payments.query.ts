import type { PaymentMethod, PaymentKind, PaymentStatus, Prisma } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { paginate, pageMeta, toNumber } from "@/shared/lib/list-query";
import { sumAmounts } from "@/shared/lib/money";
import type { ListPaymentsFilters } from "@/features/payments/schemas/payment.schema";

export type PaymentSummary = {
  id: string;
  reference: string;
  invoiceId: string;
  invoiceReference: string;
  customerName: string;
  method: PaymentMethod;
  kind: PaymentKind;
  status: PaymentStatus;
  amount: number;
  refundedAmount: number;
  currency: string;
  receivedAt: Date;
  externalReference: string | null;
};

export type PaymentListResult = {
  payments: PaymentSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const PAYMENT_SELECT = {
  id: true,
  reference: true,
  invoiceId: true,
  method: true,
  kind: true,
  status: true,
  amount: true,
  refundedAmount: true,
  currency: true,
  receivedAt: true,
  externalReference: true,
  invoice: {
    select: {
      reference: true,
      customer: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof PAYMENT_SELECT }>;

function mapPayment(p: PaymentRow): PaymentSummary {
  return {
    id: p.id,
    reference: p.reference,
    invoiceId: p.invoiceId,
    invoiceReference: p.invoice.reference,
    customerName:
      `${p.invoice.customer.firstName} ${p.invoice.customer.lastName}`.trim(),
    method: p.method,
    kind: p.kind,
    status: p.status,
    amount: toNumber(p.amount) ?? 0,
    refundedAmount: toNumber(p.refundedAmount) ?? 0,
    currency: p.currency,
    receivedAt: p.receivedAt,
    externalReference: p.externalReference,
  };
}

function buildWhere(filters: ListPaymentsFilters): Prisma.PaymentWhereInput {
  const { search, status, method } = filters;
  return {
    ...(status && status !== "all" ? { status } : {}),
    ...(method && method !== "all" ? { method } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search, mode: "insensitive" } },
            { externalReference: { contains: search, mode: "insensitive" } },
            { invoice: { reference: { contains: search, mode: "insensitive" } } },
            {
              invoice: {
                customer: { firstName: { contains: search, mode: "insensitive" } },
              },
            },
            {
              invoice: {
                customer: { lastName: { contains: search, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };
}

/** Tenant-wide payment history, newest receipts first. */
export async function listPayments(
  db: TenantDb,
  filters: ListPaymentsFilters = {},
): Promise<PaymentListResult> {
  const { page, skip, take } = paginate(filters.page);
  const where = buildWhere(filters);

  const orderBy: Prisma.PaymentOrderByWithRelationInput =
    filters.sort === "oldest" ? { receivedAt: "asc" } : { receivedAt: "desc" };

  const [payments, total] = await Promise.all([
    db.payment.findMany({ where, select: PAYMENT_SELECT, orderBy, skip, take }),
    db.payment.count({ where }),
  ]);

  return { payments: payments.map(mapPayment), ...pageMeta(total, page) };
}

export type PaymentStats = {
  total: number;
  /** Net collected this calendar month (completed charges − refunds). */
  collectedThisMonth: number;
  /** Count of payments still pending arrival. */
  pendingCount: number;
  /** Total refunded across all time. */
  refundedTotal: number;
};

export async function getPaymentStats(db: TenantDb): Promise<PaymentStats> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [total, pendingCount, monthPayments, refundAgg] = await Promise.all([
    db.payment.count({}),
    db.payment.count({ where: { status: "PENDING" } }),
    db.payment.findMany({
      where: {
        receivedAt: { gte: monthStart },
        status: { in: ["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"] },
      },
      select: { amount: true, refundedAmount: true },
    }),
    db.payment.aggregate({ _sum: { refundedAmount: true } }),
  ]);

  const collectedThisMonth = sumAmounts(
    monthPayments.map((p) =>
      sumAmounts([toNumber(p.amount) ?? 0, -(toNumber(p.refundedAmount) ?? 0)]),
    ),
  );

  return {
    total,
    collectedThisMonth,
    pendingCount,
    refundedTotal: toNumber(refundAgg._sum.refundedAmount) ?? 0,
  };
}
