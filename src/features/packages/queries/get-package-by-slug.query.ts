import type { TenantDb } from "@/shared/lib/db";
import type { PackageDetail } from "@/features/packages/queries/get-package.query";

/**
 * Public storefront lookup — unlike `getPackage` (by id, any status, used
 * by the staff admin), this is reachable by anonymous visitors and only
 * ever returns a `PUBLISHED` package. An unpublished or unknown slug
 * returns `null`, which callers should render as a 404, not an error.
 */
export async function getPackageBySlug(
  db: TenantDb,
  slug: string,
): Promise<PackageDetail | null> {
  return db.package.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      featured: true,
      shortDescription: true,
      description: true,
      destination: true,
      country: true,
      duration: true,
      durationNights: true,
      category: true,
      difficulty: true,
      coverImageKey: true,
      coverImageUrl: true,
      highlights: true,
      includedServices: true,
      excludedServices: true,
      importantNotes: true,
      whatToBring: true,
      cancellationPolicy: true,
      meetingPoint: true,
      seoTitle: true,
      seoDescription: true,
      createdAt: true,
      updatedAt: true,
      images: {
        select: { id: true, fileKey: true, url: true, alt: true, position: true },
        orderBy: { position: "asc" },
      },
    },
  });
}
