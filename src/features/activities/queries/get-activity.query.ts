import type { ResourceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type ActivityImageItem = { id: string; url: string; alt: string | null };

export type ActivityDetail = {
  id: string;
  name: string;
  category: string | null;
  durationMinutes: number | null;
  meetingPoint: string | null;
  description: string | null;
  includedItems: string[];
  excludedItems: string[];
  country: string | null;
  city: string | null;
  supplierId: string | null;
  supplierName: string | null;
  internalCost: number | null;
  sellingPrice: number | null;
  currency: string;
  coverImageUrl: string | null;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
  images: ActivityImageItem[];
};

export async function getActivity(
  db: TenantDb,
  activityId: string,
): Promise<ActivityDetail | null> {
  const activity = await db.activity.findFirst({
    where: { id: activityId, deletedAt: null },
    include: {
      images: { orderBy: { position: "asc" } },
      supplier: { select: { name: true } },
    },
  });
  if (!activity) return null;

  return {
    id: activity.id,
    name: activity.name,
    category: activity.category,
    durationMinutes: activity.durationMinutes,
    meetingPoint: activity.meetingPoint,
    description: activity.description,
    includedItems: activity.includedItems,
    excludedItems: activity.excludedItems,
    country: activity.country,
    city: activity.city,
    supplierId: activity.supplierId,
    supplierName: activity.supplier?.name ?? null,
    internalCost: toNumber(activity.internalCost),
    sellingPrice: toNumber(activity.sellingPrice),
    currency: activity.currency,
    coverImageUrl: activity.coverImageUrl,
    status: activity.status,
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
    images: activity.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
  };
}
