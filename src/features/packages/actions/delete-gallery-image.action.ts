"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";

export async function deleteGalleryImageAction(
  tenantId: string,
  packageId: string,
  imageId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  try {
    await db.packageImage.delete({
      where: { id: imageId, packageId, tenantId },
    });
  } catch {
    return { ok: false, error: "Image not found." };
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "update",
      entity: "package",
      entityId: packageId,
      metadata: { fields: "gallery_remove", imageId },
    },
  });

  logger.info("gallery image deleted", { tenantId, packageId, imageId });
  return { ok: true };
}
