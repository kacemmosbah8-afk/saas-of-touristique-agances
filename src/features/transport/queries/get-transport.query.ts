import type { ResourceStatus, TransportType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type TransportDetail = {
  id: string;
  name: string;
  type: TransportType;
  country: string | null;
  city: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  fleetNotes: string | null;
  pricingNotes: string | null;
  internalNotes: string | null;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
};

export async function getTransport(
  db: TenantDb,
  providerId: string,
): Promise<TransportDetail | null> {
  const provider = await db.transportProvider.findFirst({
    where: { id: providerId, deletedAt: null },
  });
  if (!provider) return null;

  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    country: provider.country,
    city: provider.city,
    contactName: provider.contactName,
    contactEmail: provider.contactEmail,
    contactPhone: provider.contactPhone,
    website: provider.website,
    fleetNotes: provider.fleetNotes,
    pricingNotes: provider.pricingNotes,
    internalNotes: provider.internalNotes,
    status: provider.status,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}
