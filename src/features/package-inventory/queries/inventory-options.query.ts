import type { TenantDb } from "@/shared/lib/db";

export type InventoryOption = { id: string; name: string };

export type InventoryOptions = {
  hotels: InventoryOption[];
  activities: InventoryOption[];
  guides: InventoryOption[];
  transport: InventoryOption[];
  suppliers: InventoryOption[];
};

const baseWhere = { deletedAt: null, status: { not: "ARCHIVED" as const } };
const opts = { where: baseWhere, select: { id: true, name: true }, orderBy: { name: "asc" as const }, take: 500 };

/** Non-archived resources available to attach to a package. */
export async function getInventoryOptions(db: TenantDb): Promise<InventoryOptions> {
  const [hotels, activities, guides, transport, suppliers] = await Promise.all([
    db.hotel.findMany(opts),
    db.activity.findMany(opts),
    db.guide.findMany(opts),
    db.transportProvider.findMany(opts),
    db.supplier.findMany(opts),
  ]);

  return { hotels, activities, guides, transport, suppliers };
}
