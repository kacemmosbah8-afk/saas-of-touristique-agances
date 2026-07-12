import type { TenantDb } from "@/shared/lib/db";

export type PackageSummary = {
  id: string;
  name: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  duration: number | null;
  destination: string | null;
  createdAt: Date;
};

export async function listPackages(db: TenantDb): Promise<PackageSummary[]> {
  return db.package.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      duration: true,
      destination: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
