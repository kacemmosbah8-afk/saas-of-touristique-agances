"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  updatePackageSeoSchema,
  type UpdatePackageSeoInput,
} from "@/features/packages/schemas/package.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updatePackageSeoAction(
  tenantId: string,
  packageId: string,
  input: UpdatePackageSeoInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = updatePackageSeoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.package.update({
      where: { id: packageId, tenantId, deletedAt: null },
      data: {
        seoTitle: parsed.data.seoTitle ?? null,
        seoDescription: parsed.data.seoDescription ?? null,
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
      metadata: { fields: "seo" },
    },
  });

  logger.info("package SEO updated", { tenantId, packageId });
  return { ok: true };
}
