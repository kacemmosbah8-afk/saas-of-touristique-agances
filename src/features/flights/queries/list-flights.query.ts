import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";
import type { ListFlightsFilters } from "@/features/flights/schemas/flight.schema";

export type FlightSummary = {
  id: string;
  name: string;
  nameFr: string | null;
  slug: string;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  airline: string | null;
  departureCity: string | null;
  departureCityFr: string | null;
  arrivalCity: string | null;
  arrivalCityFr: string | null;
  durationMinutes: number | null;
  stops: number;
  basePrice: number | null;
  currency: string;
  coverImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FlightListResult = {
  flights: FlightSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const PAGE_SIZE = 25;

export async function listFlights(
  db: TenantDb,
  filters: ListFlightsFilters = {},
): Promise<FlightListResult> {
  const { search, status, sort = "newest", page = 1 } = filters;

  const where = {
    deletedAt: null,
    ...(status && status !== "all" ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { airline: { contains: search, mode: "insensitive" as const } },
            { departureCity: { contains: search, mode: "insensitive" as const } },
            { arrivalCity: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" as const }
      : sort === "name_asc"
        ? { name: "asc" as const }
        : sort === "name_desc"
          ? { name: "desc" as const }
          : { createdAt: "desc" as const };

  const skip = (page - 1) * PAGE_SIZE;

  const [flights, total] = await Promise.all([
    db.flight.findMany({
      where,
      select: {
        id: true,
        name: true,
        nameFr: true,
        slug: true,
        featured: true,
        status: true,
        airline: true,
        departureCity: true,
        departureCityFr: true,
        arrivalCity: true,
        arrivalCityFr: true,
        durationMinutes: true,
        stops: true,
        basePrice: true,
        currency: true,
        coverImageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      skip,
      take: PAGE_SIZE,
    }),
    db.flight.count({ where }),
  ]);

  return {
    flights: flights.map((f) => ({ ...f, basePrice: toNumber(f.basePrice) })),
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.ceil(total / PAGE_SIZE),
  };
}
