"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import type { TenantDb } from "@/shared/lib/db";
import {
  attachInventorySchema,
  reorderInventorySchema,
  type AttachInventoryInput,
  type ReorderInventoryInput,
  type InventoryKind,
} from "@/features/package-inventory/schemas/package-inventory.schema";
import type { ActionResult } from "@/shared/types/action-result";

// --- per-kind resource ownership check -------------------------------------

async function resourceExists(
  db: TenantDb,
  tenantId: string,
  kind: InventoryKind,
  resourceId: string,
): Promise<boolean> {
  const where = { id: resourceId, tenantId, deletedAt: null };
  switch (kind) {
    case "hotel":
      return !!(await db.hotel.findFirst({ where, select: { id: true } }));
    case "activity":
      return !!(await db.activity.findFirst({ where, select: { id: true } }));
    case "guide":
      return !!(await db.guide.findFirst({ where, select: { id: true } }));
    case "transport":
      return !!(await db.transportProvider.findFirst({ where, select: { id: true } }));
    case "supplier":
      return !!(await db.supplier.findFirst({ where, select: { id: true } }));
  }
}

async function nextPosition(
  db: TenantDb,
  packageId: string,
  kind: InventoryKind,
): Promise<number> {
  const q = { where: { packageId }, orderBy: { position: "desc" as const }, select: { position: true } };
  const last =
    kind === "hotel"
      ? await db.packageHotel.findFirst(q)
      : kind === "activity"
        ? await db.packageActivity.findFirst(q)
        : kind === "guide"
          ? await db.packageGuide.findFirst(q)
          : kind === "transport"
            ? await db.packageTransport.findFirst(q)
            : await db.packageSupplier.findFirst(q);
  return (last?.position ?? -1) + 1;
}

async function createJoin(
  db: TenantDb,
  tenantId: string,
  packageId: string,
  kind: InventoryKind,
  resourceId: string,
  position: number,
  notes: string | null,
): Promise<void> {
  const base = { tenantId, packageId, position, notes };
  switch (kind) {
    case "hotel":
      await db.packageHotel.create({ data: { ...base, hotelId: resourceId } });
      return;
    case "activity":
      await db.packageActivity.create({ data: { ...base, activityId: resourceId } });
      return;
    case "guide":
      await db.packageGuide.create({ data: { ...base, guideId: resourceId } });
      return;
    case "transport":
      await db.packageTransport.create({ data: { ...base, transportProviderId: resourceId } });
      return;
    case "supplier":
      await db.packageSupplier.create({ data: { ...base, supplierId: resourceId } });
      return;
  }
}

async function deleteJoin(
  db: TenantDb,
  tenantId: string,
  kind: InventoryKind,
  joinId: string,
): Promise<void> {
  const where = { id: joinId, tenantId };
  switch (kind) {
    case "hotel":
      await db.packageHotel.delete({ where });
      return;
    case "activity":
      await db.packageActivity.delete({ where });
      return;
    case "guide":
      await db.packageGuide.delete({ where });
      return;
    case "transport":
      await db.packageTransport.delete({ where });
      return;
    case "supplier":
      await db.packageSupplier.delete({ where });
      return;
  }
}

async function joinIdsForPackage(
  db: TenantDb,
  packageId: string,
  kind: InventoryKind,
): Promise<Set<string>> {
  const q = { where: { packageId }, select: { id: true } };
  const rows =
    kind === "hotel"
      ? await db.packageHotel.findMany(q)
      : kind === "activity"
        ? await db.packageActivity.findMany(q)
        : kind === "guide"
          ? await db.packageGuide.findMany(q)
          : kind === "transport"
            ? await db.packageTransport.findMany(q)
            : await db.packageSupplier.findMany(q);
  return new Set(rows.map((r) => r.id));
}

async function updateJoinPosition(
  db: TenantDb,
  tenantId: string,
  kind: InventoryKind,
  joinId: string,
  position: number,
): Promise<void> {
  const args = { where: { id: joinId, tenantId }, data: { position } };
  switch (kind) {
    case "hotel":
      await db.packageHotel.update(args);
      return;
    case "activity":
      await db.packageActivity.update(args);
      return;
    case "guide":
      await db.packageGuide.update(args);
      return;
    case "transport":
      await db.packageTransport.update(args);
      return;
    case "supplier":
      await db.packageSupplier.update(args);
      return;
  }
}

// --- public actions --------------------------------------------------------

export async function attachInventoryAction(
  tenantId: string,
  packageId: string,
  kind: InventoryKind,
  input: AttachInventoryInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = attachInventorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const pkg = await db.package.findFirst({
    where: { id: packageId, tenantId },
    select: { id: true },
  });
  if (!pkg) return { ok: false, error: "Package not found." };

  if (!(await resourceExists(db, tenantId, kind, parsed.data.resourceId))) {
    return { ok: false, error: "Resource not found." };
  }

  try {
    const position = await nextPosition(db, packageId, kind);
    await createJoin(
      db,
      tenantId,
      packageId,
      kind,
      parsed.data.resourceId,
      position,
      emptyToNull(parsed.data.notes),
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "Already added to this package." };
    }
    throw err;
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "attach",
    entity: `package_${kind}`,
    entityId: packageId,
    metadata: { resourceId: parsed.data.resourceId },
  });
  logger.info("inventory attached", { tenantId, packageId, kind });
  return { ok: true };
}

export async function detachInventoryAction(
  tenantId: string,
  kind: InventoryKind,
  joinId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  try {
    await deleteJoin(db, tenantId, kind, joinId);
  } catch {
    return { ok: false, error: "Item not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "detach",
    entity: `package_${kind}`,
    entityId: joinId,
  });
  return { ok: true };
}

export async function reorderInventoryAction(
  tenantId: string,
  packageId: string,
  kind: InventoryKind,
  input: ReorderInventoryInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = reorderInventorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const existing = await joinIdsForPackage(db, packageId, kind);
  if (!parsed.data.orderedIds.every((id) => existing.has(id))) {
    return { ok: false, error: "Invalid item IDs." };
  }

  await Promise.all(
    parsed.data.orderedIds.map((id, i) => updateJoinPosition(db, tenantId, kind, id, i)),
  );

  await writeAudit(db, {
    userId: session.user.id,
    action: "reorder",
    entity: `package_${kind}`,
    entityId: packageId,
    metadata: { count: parsed.data.orderedIds.length },
  });
  return { ok: true };
}
