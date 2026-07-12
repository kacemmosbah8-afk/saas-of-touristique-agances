"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";

export async function deletePackageCoverAction(
  tenantId: string,
  packageId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  try {
    await db.package.update({
      where: { id: packageId, tenantId, deletedAt: null },
      data: { coverImageKey: null, coverImageUrl: null },
    });
  } catch {
    return { ok: false, error: "Package not found." };
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "update",
      entity: "package",
      entityId: packageId,
      metadata: { fields: "cover_image_removed" },
    },
  });

  logger.info("package cover removed", { tenantId, packageId });
  return { ok: true };
}
