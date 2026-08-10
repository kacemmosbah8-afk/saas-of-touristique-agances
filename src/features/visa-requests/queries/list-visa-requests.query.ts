import type { TenantDb } from "@/shared/lib/db";
import type { ListVisaRequestsFilters } from "@/features/visa-requests/schemas/visa-request.schema";

export type VisaRequestSummary = {
  id: string;
  reference: string;
  fullName: string;
  email: string | null;
  phone: string;
  destinationCountry: string;
  visaType: string;
  travelerCount: number;
  status:
    | "PENDING"
    | "CONTACTED"
    | "DOCUMENTS_REQUESTED"
    | "IN_PROGRESS"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED";
  createdAt: Date;
};

export type VisaRequestListResult = {
  visaRequests: VisaRequestSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  statusCounts: Record<string, number>;
};

const PAGE_SIZE = 25;

export async function listVisaRequests(
  db: TenantDb,
  filters: ListVisaRequestsFilters = {},
): Promise<VisaRequestListResult> {
  const { search, status, sort = "newest", page = 1 } = filters;

  const where = {
    ...(status && status !== "all" ? { status } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { reference: { contains: search, mode: "insensitive" as const } },
            { destinationCountry: { contains: search, mode: "insensitive" as const } },
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

  const [visaRequests, total, statusGroups] = await Promise.all([
    db.visaRequest.findMany({
      where,
      select: {
        id: true,
        reference: true,
        fullName: true,
        email: true,
        phone: true,
        destinationCountry: true,
        visaType: true,
        travelerCount: true,
        status: true,
        createdAt: true,
      },
      orderBy,
      skip,
      take: PAGE_SIZE,
    }),
    db.visaRequest.count({ where }),
    db.visaRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all;
  }

  return {
    visaRequests,
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.ceil(total / PAGE_SIZE),
    statusCounts,
  };
}
