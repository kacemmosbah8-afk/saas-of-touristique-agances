import type { QuoteStatus, Prisma } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { paginate, pageMeta, toNumber } from "@/shared/lib/list-query";
import { OPEN_QUOTE_STATUSES } from "@/features/quotes/lib/quote-status";
import type { ListQuotesFilters } from "@/features/quotes/schemas/quote.schema";

export type QuoteSummary = {
  id: string;
  reference: string;
  status: QuoteStatus;
  customerId: string;
  customerName: string;
  packageName: string | null;
  ownerId: string | null;
  validUntil: Date | null;
  travelStartDate: Date | null;
  travelEndDate: Date | null;
  currency: string;
  total: number;
  convertedBookingId: string | null;
  createdAt: Date;
};

export type QuoteListResult = {
  quotes: QuoteSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const QUOTE_SELECT = {
  id: true,
  reference: true,
  status: true,
  customerId: true,
  ownerId: true,
  validUntil: true,
  travelStartDate: true,
  travelEndDate: true,
  currency: true,
  total: true,
  convertedBookingId: true,
  createdAt: true,
  customer: { select: { firstName: true, lastName: true } },
  package: { select: { name: true } },
} as const;

type QuoteRow = Prisma.QuoteGetPayload<{ select: typeof QUOTE_SELECT }>;

function mapQuote(q: QuoteRow): QuoteSummary {
  return {
    id: q.id,
    reference: q.reference,
    status: q.status,
    customerId: q.customerId,
    customerName: `${q.customer.firstName} ${q.customer.lastName}`.trim(),
    packageName: q.package?.name ?? null,
    ownerId: q.ownerId,
    validUntil: q.validUntil,
    travelStartDate: q.travelStartDate,
    travelEndDate: q.travelEndDate,
    currency: q.currency,
    total: toNumber(q.total) ?? 0,
    convertedBookingId: q.convertedBookingId,
    createdAt: q.createdAt,
  };
}

function buildWhere(filters: ListQuotesFilters): Prisma.QuoteWhereInput {
  const { search, status, owner } = filters;
  return {
    deletedAt: null,
    ...(status && status !== "all" ? { status } : {}),
    ...(owner ? { ownerId: owner } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search, mode: "insensitive" } },
            { customer: { firstName: { contains: search, mode: "insensitive" } } },
            { customer: { lastName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function listQuotes(
  db: TenantDb,
  filters: ListQuotesFilters = {},
): Promise<QuoteListResult> {
  const { sort } = filters;
  const { page, skip, take } = paginate(filters.page);
  const where = buildWhere(filters);

  const orderBy: Prisma.QuoteOrderByWithRelationInput =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "name_asc"
        ? { reference: "asc" }
        : sort === "name_desc"
          ? { reference: "desc" }
          : { createdAt: "desc" };

  const [quotes, total] = await Promise.all([
    db.quote.findMany({ where, select: QUOTE_SELECT, orderBy, skip, take }),
    db.quote.count({ where }),
  ]);

  return { quotes: quotes.map(mapQuote), ...pageMeta(total, page) };
}

export type QuoteStats = {
  total: number;
  byStatus: Record<QuoteStatus, number>;
  openValue: number;
  acceptanceRate: number;
};

/**
 * Headline stats for the quotes list. `openValue` sums quotes still awaiting a
 * decision (DRAFT/SENT). `acceptanceRate` is accepted-or-converted over all
 * quotes that reached a decision (accepted/converted/declined), 0–100.
 */
export async function getQuoteStats(db: TenantDb): Promise<QuoteStats> {
  const [grouped, openAgg] = await Promise.all([
    db.quote.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    db.quote.aggregate({
      where: { deletedAt: null, status: { in: [...OPEN_QUOTE_STATUSES] } },
      _sum: { total: true },
    }),
  ]);

  const byStatus = {
    DRAFT: 0,
    SENT: 0,
    ACCEPTED: 0,
    DECLINED: 0,
    EXPIRED: 0,
    CONVERTED: 0,
  } as Record<QuoteStatus, number>;
  let total = 0;
  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
    total += row._count._all;
  }

  const won = byStatus.ACCEPTED + byStatus.CONVERTED;
  const decided = won + byStatus.DECLINED;
  const acceptanceRate = decided > 0 ? Math.round((won / decided) * 100) : 0;

  return {
    total,
    byStatus,
    openValue: toNumber(openAgg._sum.total) ?? 0,
    acceptanceRate,
  };
}
