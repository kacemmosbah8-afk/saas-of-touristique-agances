import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { prisma } from "@/shared/lib/db";

export type CompanyOption = { id: string; name: string };
export type TagOption = { id: string; name: string; color: string };
export type MemberOption = { userId: string; name: string };

export async function getCompanyOptions(db: TenantDb): Promise<CompanyOption[]> {
  return db.company.findMany({
    where: { deletedAt: null, status: { not: "ARCHIVED" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}

export async function getTagOptions(db: TenantDb): Promise<TagOption[]> {
  return db.tag.findMany({
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}

/**
 * Active members of the tenant, for owner/assignee selects. Reads through the
 * base client (User is not tenant-scoped) but filters via the tenant's
 * memberships, so it never leaks users from other tenants.
 */
export async function getMemberOptions(tenantId: string): Promise<MemberOption[]> {
  const memberships = await prisma.membership.findMany({
    where: { tenantId, status: "ACTIVE" },
    select: { userId: true, user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  return memberships.map((m) => ({
    userId: m.userId,
    name: m.user.name ?? m.user.email,
  }));
}
