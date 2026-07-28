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
    nameFr: destination.nameFr,
    slug: destination.slug,
    featured: destination.featured,
    country: destination.country,
    countryFr: destination.countryFr,
    region: destination.region,
    regionFr: destination.regionFr,
    city: destination.city,
    cityFr: destination.cityFr,
    description: destination.description,
    descriptionFr: destination.descriptionFr,
    popularAttractions: destination.popularAttractions,
    popularAttractionsFr: destination.popularAttractionsFr,
    heroImageUrl: destination.heroImageUrl,
    seoTitle: destination.seoTitle,
    seoTitleFr: destination.seoTitleFr,
    seoDescription: destination.seoDescription,
    seoDescriptionFr: destination.seoDescriptionFr,
    status: destination.status,
    createdAt: destination.createdAt,
    updatedAt: destination.updatedAt,
    gallery: destination.gallery.map((i) => ({ id: i.id, url: i.url, alt: i.alt, altFr: i.altFr })),
  };
}
