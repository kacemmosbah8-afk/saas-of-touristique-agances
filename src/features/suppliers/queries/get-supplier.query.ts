import type { ResourceStatus, SupplierType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type SupplierDocumentItem = {
  id: string;
  name: string;
  kind: string;
  url: string;
  createdAt: Date;
};

export type SupplierContactItem = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
};

export type SupplierDetail = {
  id: string;
  name: string;
  type: SupplierType;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  city: string | null;
  paymentTerms: string | null;
  internalRating: number | null;
  commissionRate: number | null;
  commissionNotes: string | null;
  notes: string | null;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
  documents: SupplierDocumentItem[];
  contacts: SupplierContactItem[];
};

export async function getSupplier(
  db: TenantDb,
  supplierId: string,
): Promise<SupplierDetail | null> {
  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, deletedAt: null },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
    },
  });
  if (!supplier) return null;

  return {
    id: supplier.id,
    name: supplier.name,
    type: supplier.type,
    contactName: supplier.contactName,
    email: supplier.email,
    phone: supplier.phone,
    website: supplier.website,
    address: supplier.address,
    country: supplier.country,
    city: supplier.city,
    paymentTerms: supplier.paymentTerms,
    internalRating: supplier.internalRating,
    commissionRate: toNumber(supplier.commissionRate),
    commissionNotes: supplier.commissionNotes,
    notes: supplier.notes,
    status: supplier.status,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
    documents: supplier.documents.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      url: d.url,
      createdAt: d.createdAt,
    })),
    contacts: supplier.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      email: c.email,
      phone: c.phone,
      isPrimary: c.isPrimary,
    })),
  };
}

export type SupplierStats = {
  total: number;
  active: number;
  byType: { type: SupplierType; count: number }[];
  averageRating: number | null;
};

export async function getSupplierStats(db: TenantDb): Promise<SupplierStats> {
  const [total, active, byType, rating] = await Promise.all([
    db.supplier.count({ where: { deletedAt: null } }),
    db.supplier.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    db.supplier.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    db.supplier.aggregate({
      where: { deletedAt: null, internalRating: { not: null } },
      _avg: { internalRating: true },
    }),
  ]);

  return {
    total,
    active,
    byType: byType
      .map((row) => ({ type: row.type, count: row._count._all }))
      .sort((a, b) => b.count - a.count),
    averageRating: rating._avg.internalRating,
  };
}
