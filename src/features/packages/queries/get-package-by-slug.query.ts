import type { TenantDb } from "@/shared/lib/db";
import type { PackageDetail } from "@/features/packages/queries/get-package.query";
import { toNumber } from "@/shared/lib/list-query";

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
  const pkg = await db.package.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: {
      id: true,
      name: true,
      nameFr: true,
      slug: true,
      status: true,
      featured: true,
      shortDescription: true,
      shortDescriptionFr: true,
      description: true,
      descriptionFr: true,
      destination: true,
      destinationFr: true,
      country: true,
      countryFr: true,
      duration: true,
      durationNights: true,
      category: true,
      categoryFr: true,
      difficulty: true,
      internalCost: true,
      sellingPrice: true,
      currency: true,
      coverImageKey: true,
      coverImageUrl: true,
      highlights: true,
      highlightsFr: true,
      includedServices: true,
      includedServicesFr: true,
      excludedServices: true,
      excludedServicesFr: true,
      importantNotes: true,
      importantNotesFr: true,
      whatToBring: true,
      whatToBringFr: true,
      cancellationPolicy: true,
      cancellationPolicyFr: true,
      meetingPoint: true,
      meetingPointFr: true,
      seoTitle: true,
      seoTitleFr: true,
      seoDescription: true,
      seoDescriptionFr: true,
      createdAt: true,
      updatedAt: true,
      images: {
        select: { id: true, fileKey: true, url: true, alt: true, altFr: true, position: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!pkg) return null;

  return {
    ...pkg,
    internalCost: toNumber(pkg.internalCost),
    sellingPrice: toNumber(pkg.sellingPrice),
  };
}
