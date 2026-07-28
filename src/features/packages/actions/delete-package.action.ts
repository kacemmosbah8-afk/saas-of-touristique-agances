"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";

export async function deletePackageAction(
  tenantId: string,
  packageId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "delete");

  try {
    await db.package.update({
      where: { id: packageId, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { ok: false, error: "Package not found." };
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "delete",
      entity: "package",
      entityId: packageId,
    },
  });

  logger.info("package deleted (soft)", { tenantId, packageId });
  return { ok: true };
}
