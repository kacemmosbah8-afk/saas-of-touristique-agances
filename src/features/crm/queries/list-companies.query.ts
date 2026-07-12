import type { Prisma, ResourceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { buildNameSort, paginate, pageMeta } from "@/shared/lib/list-query";
import { statusWhere } from "@/shared/schemas/list.schema";
import type { ListCompaniesFilters } from "@/features/crm/schemas/company.schema";

export type CompanySummary = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  customerCount: number;
  status: ResourceStatus;
  updatedAt: Date;
};

export type CompanyListResult = {
  companies: CompanySummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listCompanies(
  db: TenantDb,
  filters: ListCompaniesFilters = {},
): Promise<CompanyListResult> {
  const { search, status, sort } = filters;
  const { page, skip, take } = paginate(filters.page);

  const where: Prisma.CompanyWhereInput = {
    ...statusWhere(status),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { industry: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [companies, total] = await Promise.all([
    db.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        industry: true,
        status: true,
        updatedAt: true,
        _count: { select: { customers: true } },
      },
      orderBy: buildNameSort(sort),
      skip,
      take,
    }),
    db.company.count({ where }),
  ]);

  return {
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      industry: c.industry,
      customerCount: c._count.customers,
      status: c.status,
      updatedAt: c.updatedAt,
    })),
    ...pageMeta(total, page),
  };
}
