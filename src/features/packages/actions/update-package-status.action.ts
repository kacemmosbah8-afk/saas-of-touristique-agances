"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  updatePackageStatusSchema,
  type UpdatePackageStatusInput,
} from "@/features/packages/schemas/package.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updatePackageStatusAction(
  tenantId: string,
  packageId: string,
  input: UpdatePackageStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "manage");

  const parsed = updatePackageStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid status." };
  }

  try {
    await db.package.update({
      where: { id: packageId, tenantId, deletedAt: null },
      data: { status: parsed.data.status },
    });
  } catch {
    return { ok: false, error: "Package not found." };
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "status_change",
      entity: "package",
      entityId: packageId,
      metadata: { status: parsed.data.status },
    },
  });

  logger.info("package status updated", { tenantId, packageId, status: parsed.data.status });
  return { ok: true };
}
