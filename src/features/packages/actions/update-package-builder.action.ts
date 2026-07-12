"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  updatePackageBuilderSchema,
  type UpdatePackageBuilderInput,
} from "@/features/packages/schemas/package.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updatePackageBuilderAction(
  tenantId: string,
  packageId: string,
  input: UpdatePackageBuilderInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = updatePackageBuilderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.package.update({
      where: { id: packageId, tenantId, deletedAt: null },
      data: {
        highlights: parsed.data.highlights ?? [],
        includedServices: parsed.data.includedServices ?? [],
        excludedServices: parsed.data.excludedServices ?? [],
        importantNotes: parsed.data.importantNotes ?? [],
        whatToBring: parsed.data.whatToBring ?? [],
        cancellationPolicy: parsed.data.cancellationPolicy ?? null,
        meetingPoint: parsed.data.meetingPoint ?? null,
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
      metadata: { fields: "builder" },
    },
  });

  logger.info("package builder updated", { tenantId, packageId });
  return { ok: true };
}
