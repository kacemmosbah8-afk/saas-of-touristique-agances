import "server-only";

import type { TenantDb } from "@/shared/lib/db";

export async function listMembers(db: TenantDb) {
  return db.membership.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
}

export type TenantMember = Awaited<ReturnType<typeof listMembers>>[number];
