"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  updatePackageCoverSchema,
  type UpdatePackageCoverInput,
} from "@/features/packages/schemas/package.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updatePackageCoverAction(
  tenantId: string,
  packageId: string,
  input: UpdatePackageCoverInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = updatePackageCoverSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid image data." };
  }

  try {
    await db.package.update({
      where: { id: packageId, tenantId, deletedAt: null },
      data: {
        coverImageKey: parsed.data.fileKey,
        coverImageUrl: parsed.data.url,
      },
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
      metadata: { fields: "cover_image" },
    },
  });

  logger.info("package cover updated", { tenantId, packageId });
  return { ok: true };
}
