import type { TenantDb } from "@/shared/lib/db";

export type PackageImage = {
  id: string;
  fileKey: string;
  url: string;
  alt: string | null;
  position: number;
};

export type PackageDetail = {
  id: string;
  name: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;

  // Details
  shortDescription: string | null;
  description: string | null;
  destination: string | null;
  country: string | null;
  duration: number | null;
  durationNights: number | null;
  category: string | null;
  difficulty: "EASY" | "MODERATE" | "CHALLENGING" | "EXTREME" | null;

  // Media
  coverImageKey: string | null;
  coverImageUrl: string | null;
  images: PackageImage[];

  // Builder
  highlights: string[];
  includedServices: string[];
  excludedServices: string[];
  importantNotes: string[];
  whatToBring: string[];
  cancellationPolicy: string | null;
  meetingPoint: string | null;

  // SEO
  seoTitle: string | null;
  seoDescription: string | null;

  createdAt: Date;
  updatedAt: Date;
};

export async function getPackage(
  db: TenantDb,
  packageId: string,
): Promise<PackageDetail | null> {
  return db.package.findFirst({
    where: { id: packageId, deletedAt: null },
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
