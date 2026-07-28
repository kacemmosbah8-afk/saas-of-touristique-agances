import type { ResourceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type GuideDetail = {
  id: string;
  name: string;
  languages: string[];
  certifications: string[];
  experienceYears: number | null;
  dailyRate: number | null;
  currency: string;
  country: string | null;
  city: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  availabilityNotes: string | null;
  internalNotes: string | null;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
};

export async function getGuide(db: TenantDb, guideId: string): Promise<GuideDetail | null> {
  const guide = await db.guide.findFirst({ where: { id: guideId, deletedAt: null } });
  if (!guide) return null;

  return {
    id: guide.id,
    name: guide.name,
    languages: guide.languages,
    certifications: guide.certifications,
    experienceYears: guide.experienceYears,
    dailyRate: toNumber(guide.dailyRate),
    currency: guide.currency,
    country: guide.country,
    city: guide.city,
    contactEmail: guide.contactEmail,
    contactPhone: guide.contactPhone,
    availabilityNotes: guide.availabilityNotes,
    internalNotes: guide.internalNotes,
    status: guide.status,
    createdAt: guide.createdAt,
    updatedAt: guide.updatedAt,
  };
}
