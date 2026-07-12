import type { TenantDb } from "@/shared/lib/db";

export type PackageDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  duration: number | null;
  destination: string | null;
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
      description: true,
      status: true,
      duration: true,
      destination: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
