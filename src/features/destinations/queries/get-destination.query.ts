import type { ResourceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type DestinationImageItem = { id: string; url: string; alt: string | null };

export type DestinationDetail = {
  id: string;
  name: string;
  slug: string;
  featured: boolean;
  country: string;
  region: string | null;
  city: string | null;
  description: string | null;
  popularAttractions: string[];
  heroImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
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
