import type { BookingStatus, Prisma } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { paginate, pageMeta, toNumber } from "@/shared/lib/list-query";
import { ACTIVE_BOOKING_STATUSES } from "@/features/bookings/lib/status";
import type { ListBookingsFilters } from "@/features/bookings/schemas/booking.schema";

export type BookingSummary = {
  id: string;
  reference: string;
  status: BookingStatus;
  customerId: string;
  customerName: string;
  packageName: string | null;
  ownerId: string | null;
  travelStartDate: Date | null;
  travelEndDate: Date | null;
  adults: number;
  children: number;
  currency: string;
  total: number;
  createdAt: Date;
};

export type BookingListResult = {
  bookings: BookingSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const BOOKING_SELECT = {
  id: true,
  reference: true,
  status: true,
  customerId: true,
  ownerId: true,
  travelStartDate: true,
  travelEndDate: true,
  adults: true,
  children: true,
  currency: true,
  total: true,
  createdAt: true,
  customer: { select: { firstName: true, lastName: true } },
  package: { select: { name: true } },
} as const;

type BookingRow = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

function mapBooking(b: BookingRow): BookingSummary {
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    customerId: b.customerId,
    customerName: `${b.customer.firstName} ${b.customer.lastName}`.trim(),
    packageName: b.package?.name ?? null,
    ownerId: b.ownerId,
    travelStartDate: b.travelStartDate,
    travelEndDate: b.travelEndDate,
    adults: b.adults,
    children: b.children,
    currency: b.currency,
    total: toNumber(b.total) ?? 0,
    createdAt: b.createdAt,
  };
}

function buildWhere(filters: ListBookingsFilters): Prisma.BookingWhereInput {
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

export async function listBookings(
  db: TenantDb,
  filters: ListBookingsFilters = {},
): Promise<BookingListResult> {
  const { sort } = filters;
  const { page, skip, take } = paginate(filters.page);
  const where = buildWhere(filters);

  const orderBy: Prisma.BookingOrderByWithRelationInput =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "name_asc"
        ? { reference: "asc" }
        : sort === "name_desc"
          ? { reference: "desc" }
          : { createdAt: "desc" };

  const [bookings, total] = await Promise.all([
    db.booking.findMany({ where, select: BOOKING_SELECT, orderBy, skip, take }),
    db.booking.count({ where }),
  ]);

  return { bookings: bookings.map(mapBooking), ...pageMeta(total, page) };
}

export type BookingStats = {
  total: number;
  byStatus: Record<BookingStatus, number>;
  activeRevenue: number;
  upcoming: number;
};

/** Headline stats for the bookings list. Revenue counts active bookings only. */
export async function getBookingStats(db: TenantDb): Promise<BookingStats> {
  const [grouped, revenue, upcoming] = await Promise.all([
    db.booking.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    db.booking.aggregate({
      where: { deletedAt: null, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
      _sum: { total: true },
    }),
    db.booking.count({
      where: {
        deletedAt: null,
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        travelStartDate: { gte: new Date() },
      },
    }),
  ]);

  const byStatus = {
    DRAFT: 0,
    CONFIRMED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  } as Record<BookingStatus, number>;
  let total = 0;
  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
    total += row._count._all;
  }

  return {
    total,
    byStatus,
    activeRevenue: toNumber(revenue._sum.total) ?? 0,
    upcoming,
  };
}
