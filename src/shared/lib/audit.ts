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

type PortalAuditParams = {
  customerId: string;
  action: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * The Customer Portal's counterpart to `writeAudit` — same `AuditLog`
 * table (one queryable trail for every actor, staff or traveler), but a
 * traveler is a `Customer`, not a `User`, and `AuditLog.userId` has a real
 * foreign key to `User`. Writing `customerId` into `userId` would violate
 * that FK, so this writes `userId: null` (the schema's own "system/
 * non-staff actor" convention) and carries `customerId` in `metadata`
 * instead, tagged with a fixed `entity: "portal_session"` so every portal
 * access is one filter away (`entity = 'portal_session'`) regardless of
 * which specific action it was — see PROJECT.md, "Customer Portal
 * Capability", Phase 7.
 */
export async function writePortalAudit(db: TenantDb, params: PortalAuditParams): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: null,
      action: params.action,
      entity: "portal_session",
      entityId: params.entityId,
      metadata: { customerId: params.customerId, ...(params.metadata as object | undefined) },
    },
  });
}
