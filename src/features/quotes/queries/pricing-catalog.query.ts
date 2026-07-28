import "server-only";

import type { BookingItemType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

/**
 * A priceable inventory item the agent can drop onto a quote (or booking) as a
 * line, pre-filled with its configured rate. This is the "automated pricing
 * from package/inventory rates" half of the Pricing & Quotes sprint: instead of
 * typing every unit price by hand, the agent picks a catalog entry and the line
 * type, description, referenceId and unit price are seeded from inventory.
 *
 * `unitPrice` is null when the inventory record has no rate configured (e.g. a
 * transport provider) — the line still seeds its type/description/reference and
 * the agent supplies the price. Rates that exist are the sellable figures
 * (RoomType.basePrice, Activity.sellingPrice, Guide.dailyRate), never internal
 * cost.
 */
export type CatalogEntry = {
  /** Stable pointer stored on the line's FK-free `referenceId`. */
  referenceId: string;
  type: BookingItemType;
  label: string;
  /** Secondary context (city, room capacity, …) for disambiguation in the UI. */
  sublabel: string | null;
  unitPrice: number | null;
};

export type PricingCatalog = {
  hotels: CatalogEntry[];
  activities: CatalogEntry[];
  guides: CatalogEntry[];
  transport: CatalogEntry[];
};

const CATALOG_LIMIT = 200;

/**
 * Build the tenant's priceable catalog. Each list is independently limited so a
 * single very large inventory category can't crowd out the others. All reads go
 * through the tenant-scoped client, so entries are always this tenant's own.
 */
export async function getPricingCatalog(db: TenantDb): Promise<PricingCatalog> {
  const [roomTypes, activities, guides, transport] = await Promise.all([
    db.roomType.findMany({
      where: { hotel: { deletedAt: null } },
      select: {
        id: true,
        name: true,
        basePrice: true,
        capacity: true,
        hotel: { select: { name: true, city: true } },
      },
      orderBy: [{ hotel: { name: "asc" } }, { position: "asc" }],
      take: CATALOG_LIMIT,
    }),
    db.activity.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, sellingPrice: true, city: true },
      orderBy: { name: "asc" },
      take: CATALOG_LIMIT,
    }),
    db.guide.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, dailyRate: true, city: true },
      orderBy: { name: "asc" },
      take: CATALOG_LIMIT,
    }),
    db.transportProvider.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, type: true, city: true },
      orderBy: { name: "asc" },
      take: CATALOG_LIMIT,
    }),
  ]);

  return {
    hotels: roomTypes.map((r) => ({
      referenceId: r.id,
      type: "HOTEL" as const,
      label: `${r.hotel.name} — ${r.name}`,
      sublabel: r.hotel.city ?? (r.capacity ? `Sleeps ${r.capacity}` : null),
      unitPrice: toNumber(r.basePrice),
    })),
    activities: activities.map((a) => ({
      referenceId: a.id,
      type: "ACTIVITY" as const,
      label: a.name,
      sublabel: a.city,
      unitPrice: toNumber(a.sellingPrice),
    })),
    guides: guides.map((g) => ({
      referenceId: g.id,
      type: "GUIDE" as const,
      label: g.name,
      sublabel: g.city,
      unitPrice: toNumber(g.dailyRate),
    })),
    transport: transport.map((t) => ({
      referenceId: t.id,
      type: "TRANSPORT" as const,
      label: t.name,
      sublabel: t.city ?? t.type,
      unitPrice: null,
    })),
  };
}

/** Flatten the catalog into a single list (useful for a combined picker). */
export function flattenCatalog(catalog: PricingCatalog): CatalogEntry[] {
  return [...catalog.hotels, ...catalog.activities, ...catalog.guides, ...catalog.transport];
}
