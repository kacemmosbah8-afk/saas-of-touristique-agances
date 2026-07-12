import type { ResourceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type CompanyCustomerItem = {
  id: string;
  name: string;
  email: string | null;
};

export type CompanyDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
  industry: string | null;
  notes: string | null;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
  customers: CompanyCustomerItem[];
};

export async function getCompany(db: TenantDb, companyId: string): Promise<CompanyDetail | null> {
  const company = await db.company.findFirst({
    where: { id: companyId, deletedAt: null },
    include: {
      customers: {
        where: { deletedAt: null },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
  if (!company) return null;

  return {
    id: company.id,
    name: company.name,
    email: company.email,
    phone: company.phone,
    website: company.website,
    taxId: company.taxId,
    industry: company.industry,
    notes: company.notes,
    status: company.status,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    customers: company.customers.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
    })),
  };
}
