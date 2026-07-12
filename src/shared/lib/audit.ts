import "server-only";
import type { Prisma } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

type AuditParams = {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Append a row to the audit trail. `tenantId` is injected automatically by the
 * tenant-scoped client. Centralized so every mutation records who-did-what the
 * same way (see also the inline calls in the M0/M1 package actions).
 */
export async function writeAudit(db: TenantDb, params: AuditParams): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata,
    },
  });
}
