import type { CustomerType, LeadSource, Prisma, ResourceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { buildNameSort, paginate, pageMeta } from "@/shared/lib/list-query";
import { statusWhere } from "@/shared/schemas/list.schema";
import type { ListCustomersFilters } from "@/features/crm/schemas/customer.schema";

export type CustomerSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  type: CustomerType;
  status: ResourceStatus;
  leadSource: LeadSource | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerListResult = {
  customers: CustomerSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function listCustomers(
  db: TenantDb,
  filters: ListCustomersFilters = {},
): Promise<CustomerListResult> {
  const { search, status, sort, type, source } = filters;
  const { page, skip, take } = paginate(filters.page);

  const where: Prisma.CustomerWhereInput = {
    ...statusWhere(status),
    ...(type && type !== "all" ? { type } : {}),
    ...(source && source !== "all" ? { leadSource: source } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "name_asc"
      ? [{ firstName: "asc" as const }]
      : sort === "name_desc"
        ? [{ firstName: "desc" as const }]
        : buildNameSort(sort);

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        type: true,
        status: true,
        leadSource: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
      skip,
      take,
    }),
    db.customer.count({ where }),
  ]);

  return {
    customers: customers.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      type: c.type,
      status: c.status,
      leadSource: c.leadSource,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    ...pageMeta(total, page),
  };
}
