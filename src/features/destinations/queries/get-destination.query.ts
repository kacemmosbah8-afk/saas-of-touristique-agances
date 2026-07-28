import type { ResourceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type DestinationImageItem = {
  id: string;
  url: string;
  alt: string | null;
  altFr: string | null;
};

export type DestinationDetail = {
  id: string;
  name: string;
  nameFr: string | null;
  slug: string;
  featured: boolean;
  country: string;
  countryFr: string | null;
  region: string | null;
  regionFr: string | null;
  city: string | null;
  cityFr: string | null;
  description: string | null;
  descriptionFr: string | null;
  popularAttractions: string[];
  popularAttractionsFr: string[];
  heroImageUrl: string | null;
  seoTitle: string | null;
  seoTitleFr: string | null;
  seoDescription: string | null;
  seoDescriptionFr: string | null;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
  gallery: DestinationImageItem[];
};

export async function getDestination(
  db: TenantDb,
  destinationId: string,
): Promise<DestinationDetail | null> {
  const destination = await db.destination.findFirst({
    where: { id: destinationId, deletedAt: null },
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
