import type { TenantDb } from "@/shared/lib/db";

export type SearchResultType =
  | "package"
  | "hotel"
  | "activity"
  | "guide"
  | "supplier"
  | "destination";

export type SearchResult = {
  type: SearchResultType;
  id: string;
  name: string;
  subtitle: string | null;
  href: string;
};

export type SearchGroup = {
  type: SearchResultType;
  label: string;
  results: SearchResult[];
};

const PER_TYPE = 6;

/**
 * Global search across every M1/M2 catalogue entity. Runs one indexed
 * name/location query per entity in parallel and returns grouped results,
 * each with a deep link into its edit page.
 */
export async function globalSearch(
  db: TenantDb,
  tenantSlug: string,
  rawQuery: string,
): Promise<SearchGroup[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const contains = { contains: query, mode: "insensitive" as const };

  const [packages, hotels, activities, guides, suppliers, destinations] = await Promise.all([
    db.package.findMany({
      where: {
        deletedAt: null,
        OR: [{ name: contains }, { destination: contains }, { country: contains }],
      },
      select: { id: true, name: true, destination: true, country: true },
      take: PER_TYPE,
      orderBy: { updatedAt: "desc" },
    }),
    db.hotel.findMany({
      where: { deletedAt: null, OR: [{ name: contains }, { city: contains }, { country: contains }] },
      select: { id: true, name: true, city: true, country: true },
      take: PER_TYPE,
      orderBy: { updatedAt: "desc" },
    }),
    db.activity.findMany({
      where: { deletedAt: null, OR: [{ name: contains }, { category: contains }, { city: contains }] },
      select: { id: true, name: true, category: true, city: true },
      take: PER_TYPE,
      orderBy: { updatedAt: "desc" },
    }),
    db.guide.findMany({
      where: { deletedAt: null, OR: [{ name: contains }, { city: contains }, { languages: { has: query } }] },
      select: { id: true, name: true, city: true, country: true },
      take: PER_TYPE,
      orderBy: { updatedAt: "desc" },
    }),
    db.supplier.findMany({
      where: { deletedAt: null, OR: [{ name: contains }, { contactName: contains }, { city: contains }] },
      select: { id: true, name: true, city: true, country: true },
      take: PER_TYPE,
      orderBy: { updatedAt: "desc" },
    }),
    db.destination.findMany({
      where: { deletedAt: null, OR: [{ name: contains }, { country: contains }, { region: contains }] },
      select: { id: true, name: true, country: true, region: true },
      take: PER_TYPE,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const base = `/${tenantSlug}/admin`;
  const location = (a: string | null, b: string | null) =>
    [a, b].filter(Boolean).join(", ") || null;

  const groups: SearchGroup[] = [
    {
      type: "package",
      label: "Packages",
      results: packages.map((p) => ({
        type: "package" as const,
        id: p.id,
        name: p.name,
        subtitle: location(p.destination, p.country),
        href: `${base}/packages/${p.id}/edit`,
      })),
    },
    {
      type: "hotel",
      label: "Hotels",
      results: hotels.map((h) => ({
        type: "hotel" as const,
        id: h.id,
        name: h.name,
        subtitle: location(h.city, h.country),
        href: `${base}/hotels/${h.id}/edit`,
      })),
    },
    {
      type: "activity",
      label: "Activities",
      results: activities.map((a) => ({
        type: "activity" as const,
        id: a.id,
        name: a.name,
        subtitle: location(a.category, a.city),
        href: `${base}/activities/${a.id}/edit`,
      })),
    },
    {
      type: "guide",
      label: "Guides",
      results: guides.map((g) => ({
        type: "guide" as const,
        id: g.id,
        name: g.name,
        subtitle: location(g.city, g.country),
        href: `${base}/guides/${g.id}/edit`,
      })),
    },
    {
      type: "supplier",
      label: "Suppliers",
      results: suppliers.map((s) => ({
        type: "supplier" as const,
        id: s.id,
        name: s.name,
        subtitle: location(s.city, s.country),
        href: `${base}/suppliers/${s.id}/edit`,
      })),
    },
    {
      type: "destination",
      label: "Destinations",
      results: destinations.map((d) => ({
        type: "destination" as const,
        id: d.id,
        name: d.name,
        subtitle: location(d.region, d.country),
        href: `${base}/destinations/${d.id}/edit`,
      })),
    },
  ];

  return groups.filter((g) => g.results.length > 0);
}
