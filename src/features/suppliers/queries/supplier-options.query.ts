import type { TenantDb } from "@/shared/lib/db";

export type SupplierOption = { id: string; name: string };

/** Lightweight active-supplier list for select inputs (e.g. on activities). */
export async function getSupplierOptions(db: TenantDb): Promise<SupplierOption[]> {
  return db.supplier.findMany({
    where: { deletedAt: null, status: { not: "ARCHIVED" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}
