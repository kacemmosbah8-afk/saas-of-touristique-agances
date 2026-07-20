import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type PublicActivityImage = { id: string; url: string; alt: string | null };

/**
 * Public storefront shape — deliberately narrower than `ActivityDetail`:
 * no `internalCost`, no `supplierId`/`supplierName` (the supplier is the
 * agency's own vendor relationship, not something a visitor should see).
 * Only ever returns an `ACTIVE` activity; an inactive/archived/unknown
 * slug returns `null`.
 */
export type PublicActivityDetail = {
  id: string;
  name: string;
  slug: string;
  featured: boolean;
  category: string | null;
  durationMinutes: number | null;
  meetingPoint: string | null;
  description: string | null;
  includedItems: string[];
  excludedItems: string[];
  country: string | null;
  city: string | null;
  sellingPrice: number | null;
  currency: string;
  coverImageUrl: string | null;
  images: PublicActivityImage[];
};

export async function getActivityBySlug(
  db: TenantDb,
  slug: string,
): Promise<PublicActivityDetail | null> {
  const activity = await db.activity.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      featured: true,
      category: true,
      durationMinutes: true,
      meetingPoint: true,
      description: true,
      includedItems: true,
      excludedItems: true,
      country: true,
      city: true,
      sellingPrice: true,
      currency: true,
      coverImageUrl: true,
      images: {
        select: { id: true, url: true, alt: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!activity) return null;

  return { ...activity, sellingPrice: toNumber(activity.sellingPrice) };
}
