import type { ResourceStatus, SupplierType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type SupplierDocumentItem = {
  id: string;
  name: string;
  kind: string;
  url: string;
  createdAt: Date;
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
  notes: string | null;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
  documents: SupplierDocumentItem[];
};

export async function getSupplier(
  db: TenantDb,
  supplierId: string,
): Promise<SupplierDetail | null> {
  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, deletedAt: null },
    include: { documents: { orderBy: { createdAt: "desc" } } },
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
  };
}
