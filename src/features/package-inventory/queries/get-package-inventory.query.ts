import type { ResourceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type InventoryItem = {
  /** The join-row id (used for detach/reorder). */
  id: string;
  /** The referenced resource id. */
  resourceId: string;
  name: string;
  status: ResourceStatus;
  position: number;
  notes: string | null;
};

export type PackageInventory = {
  hotels: InventoryItem[];
  activities: InventoryItem[];
  guides: InventoryItem[];
  transport: InventoryItem[];
  suppliers: InventoryItem[];
};

export async function getPackageInventory(
  db: TenantDb,
  packageId: string,
): Promise<PackageInventory> {
  const [hotels, activities, guides, transport, suppliers] = await Promise.all([
    db.packageHotel.findMany({
      where: { packageId },
      orderBy: { position: "asc" },
      include: { hotel: { select: { id: true, name: true, status: true } } },
    }),
    db.packageActivity.findMany({
      where: { packageId },
      orderBy: { position: "asc" },
      include: { activity: { select: { id: true, name: true, status: true } } },
    }),
    db.packageGuide.findMany({
      where: { packageId },
      orderBy: { position: "asc" },
      include: { guide: { select: { id: true, name: true, status: true } } },
    }),
    db.packageTransport.findMany({
      where: { packageId },
      orderBy: { position: "asc" },
      include: { provider: { select: { id: true, name: true, status: true } } },
    }),
    db.packageSupplier.findMany({
      where: { packageId },
      orderBy: { position: "asc" },
      include: { supplier: { select: { id: true, name: true, status: true } } },
    }),
  ]);

  return {
    hotels: hotels.map((h) => ({
      id: h.id,
      resourceId: h.hotel.id,
      name: h.hotel.name,
      status: h.hotel.status,
      position: h.position,
      notes: h.notes,
    })),
    activities: activities.map((a) => ({
      id: a.id,
      resourceId: a.activity.id,
      name: a.activity.name,
      status: a.activity.status,
      position: a.position,
      notes: a.notes,
    })),
    guides: guides.map((g) => ({
      id: g.id,
      resourceId: g.guide.id,
      name: g.guide.name,
      status: g.guide.status,
      position: g.position,
      notes: g.notes,
    })),
    transport: transport.map((t) => ({
      id: t.id,
      resourceId: t.provider.id,
      name: t.provider.name,
      status: t.provider.status,
      position: t.position,
      notes: t.notes,
    })),
    suppliers: suppliers.map((s) => ({
      id: s.id,
      resourceId: s.supplier.id,
      name: s.supplier.name,
      status: s.supplier.status,
      position: s.position,
      notes: s.notes,
    })),
  };
}
