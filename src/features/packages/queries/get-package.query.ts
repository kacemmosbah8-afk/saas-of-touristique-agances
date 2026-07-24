import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type PackageImage = {
  id: string;
  fileKey: string;
  url: string;
  alt: string | null;
  altFr: string | null;
  position: number;
};

export type PackageDetail = {
  id: string;
  name: string;
  nameFr: string | null;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;

  // Details
  shortDescription: string | null;
  shortDescriptionFr: string | null;
  description: string | null;
  descriptionFr: string | null;
  destination: string | null;
  destinationFr: string | null;
  country: string | null;
  countryFr: string | null;
  duration: number | null;
  durationNights: number | null;
  category: string | null;
  categoryFr: string | null;
  difficulty: "EASY" | "MODERATE" | "CHALLENGING" | "EXTREME" | null;

  // Pricing
  internalCost: number | null;
  sellingPrice: number | null;
  currency: string;

  // Media
  coverImageKey: string | null;
  coverImageUrl: string | null;
  images: PackageImage[];

  // Builder
  highlights: string[];
  highlightsFr: string[];
  includedServices: string[];
  includedServicesFr: string[];
  excludedServices: string[];
  excludedServicesFr: string[];
  importantNotes: string[];
  importantNotesFr: string[];
  whatToBring: string[];
  whatToBringFr: string[];
  cancellationPolicy: string | null;
  cancellationPolicyFr: string | null;
  meetingPoint: string | null;
  meetingPointFr: string | null;

  // SEO
  seoTitle: string | null;
  seoTitleFr: string | null;
  seoDescription: string | null;
  seoDescriptionFr: string | null;

  createdAt: Date;
  updatedAt: Date;
};

export async function getPackage(
  db: TenantDb,
  packageId: string,
): Promise<PackageDetail | null> {
  const pkg = await db.package.findFirst({
    where: { id: packageId, deletedAt: null },
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
