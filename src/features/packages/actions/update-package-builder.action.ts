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
        highlightsFr: parsed.data.highlightsFr ?? [],
        includedServices: parsed.data.includedServices ?? [],
        includedServicesFr: parsed.data.includedServicesFr ?? [],
        excludedServices: parsed.data.excludedServices ?? [],
        excludedServicesFr: parsed.data.excludedServicesFr ?? [],
        importantNotes: parsed.data.importantNotes ?? [],
        importantNotesFr: parsed.data.importantNotesFr ?? [],
        whatToBring: parsed.data.whatToBring ?? [],
        whatToBringFr: parsed.data.whatToBringFr ?? [],
        cancellationPolicy: parsed.data.cancellationPolicy ?? null,
        cancellationPolicyFr: parsed.data.cancellationPolicyFr ?? null,
        meetingPoint: parsed.data.meetingPoint ?? null,
        meetingPointFr: parsed.data.meetingPointFr ?? null,
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
