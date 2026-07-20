import type { TenantDb } from "@/shared/lib/db";
import type { DestinationDetail } from "@/features/destinations/queries/get-destination.query";

/**
 * Public storefront lookup — only ever returns an `ACTIVE` destination. An
 * inactive/archived/unknown slug returns `null`, which callers should
 * render as a 404, not an error.
 */
export async function getDestinationBySlug(
  db: TenantDb,
  slug: string,
): Promise<DestinationDetail | null> {
  const destination = await db.destination.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    include: { gallery: { orderBy: { position: "asc" } } },
  });
  if (!destination) return null;

  return {
    id: destination.id,
    name: destination.name,
    slug: destination.slug,
    featured: destination.featured,
    country: destination.country,
    region: destination.region,
    city: destination.city,
    description: destination.description,
    popularAttractions: destination.popularAttractions,
    heroImageUrl: destination.heroImageUrl,
    seoTitle: destination.seoTitle,
    seoDescription: destination.seoDescription,
    status: destination.status,
    createdAt: destination.createdAt,
    updatedAt: destination.updatedAt,
    gallery: destination.gallery.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
  };
}
