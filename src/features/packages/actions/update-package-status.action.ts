"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  updatePackageStatusSchema,
  type UpdatePackageStatusInput,
} from "@/features/packages/schemas/package.schema";
import { getMissingPublishRequirements } from "@/features/packages/lib/publish-requirements";
import { toNumber } from "@/shared/lib/list-query";
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

  if (parsed.data.status === "PUBLISHED") {
    const pkg = await db.package.findFirst({
      where: { id: packageId, tenantId, deletedAt: null },
      select: {
        sellingPrice: true,
        duration: true,
        coverImageUrl: true,
        _count: { select: { images: true } },
        itineraryDays: { select: { _count: { select: { activities: true } } } },
      },
    });
    if (!pkg) return { ok: false, error: "Package not found." };

    const missing = getMissingPublishRequirements({
      sellingPrice: toNumber(pkg.sellingPrice),
      duration: pkg.duration,
      coverImageUrl: pkg.coverImageUrl,
      imageCount: pkg._count.images,
      activityCount: pkg.itineraryDays.reduce((sum, day) => sum + day._count.activities, 0),
    });
    if (missing.length > 0) {
      return { ok: false, error: `Add ${missing.join(", ")} before publishing.` };
    }
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
