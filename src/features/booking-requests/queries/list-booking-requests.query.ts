import type { TenantDb } from "@/shared/lib/db";
import type { ListBookingRequestsFilters } from "@/features/booking-requests/schemas/booking-request.schema";

export type BookingRequestSummary = {
  id: string;
  reference: string;
  fullName: string;
  email: string;
  phone: string | null;
  adults: number;
  children: number;
  preferredDate: Date | null;
  productType: "PACKAGE" | "HOTEL" | "DESTINATION" | "ACTIVITY" | "FLIGHT";
  productName: string;
  productSlug: string;
  status: "PENDING" | "CONTACTED" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  convertedBookingId: string | null;
  createdAt: Date;
};

export type BookingRequestListResult = {
  bookingRequests: BookingRequestSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  statusCounts: Record<string, number>;
};

const PAGE_SIZE = 25;

export async function listBookingRequests(
  db: TenantDb,
  filters: ListBookingRequestsFilters = {},
): Promise<BookingRequestListResult> {
  const { search, status, productType, sort = "newest", page = 1 } = filters;

  const where = {
    ...(status && status !== "all" ? { status } : {}),
    ...(productType && productType !== "all" ? { productType } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { reference: { contains: search, mode: "insensitive" as const } },
            { productName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" as const }
      : sort === "name_asc"
        ? { fullName: "asc" as const }
        : sort === "name_desc"
          ? { fullName: "desc" as const }
          : { createdAt: "desc" as const };

  const skip = (page - 1) * PAGE_SIZE;

  const [bookingRequests, total, statusGroups] = await Promise.all([
    db.bookingRequest.findMany({
      where,
      select: {
        id: true,
        reference: true,
        fullName: true,
        email: true,
        phone: true,
        adults: true,
        children: true,
        preferredDate: true,
        productType: true,
        productName: true,
        productSlug: true,
        status: true,
        convertedBookingId: true,
        createdAt: true,
      },
      orderBy,
      skip,
      take: PAGE_SIZE,
    }),
    db.bookingRequest.count({ where }),
    db.bookingRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all;
  }

  return {
    bookingRequests,
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.ceil(total / PAGE_SIZE),
    statusCounts,
  };
}
