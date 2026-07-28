"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  updatePackageDetailsSchema,
  type UpdatePackageDetailsInput,
} from "@/features/packages/schemas/package.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updatePackageAction(
  tenantId: string,
  packageId: string,
  input: UpdatePackageDetailsInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = updatePackageDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.package.update({
      where: { id: packageId, tenantId, deletedAt: null },
      data: {
        name: parsed.data.name,
        nameFr: parsed.data.nameFr ?? null,
        slug: parsed.data.slug,
        shortDescription: parsed.data.shortDescription ?? null,
        shortDescriptionFr: parsed.data.shortDescriptionFr ?? null,
        description: parsed.data.description ?? null,
        descriptionFr: parsed.data.descriptionFr ?? null,
        destination: parsed.data.destination ?? null,
        destinationFr: parsed.data.destinationFr ?? null,
        country: parsed.data.country ?? null,
        countryFr: parsed.data.countryFr ?? null,
        duration: parsed.data.duration ?? null,
        durationNights: parsed.data.durationNights ?? null,
        category: parsed.data.category ?? null,
        categoryFr: parsed.data.categoryFr ?? null,
        difficulty: parsed.data.difficulty ?? null,
        featured: parsed.data.featured ?? false,
        internalCost: parsed.data.internalCost ?? null,
        sellingPrice: parsed.data.sellingPrice ?? null,
        currency: parsed.data.currency,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") return { ok: false, error: "Package not found." };
      if (err.code === "P2002") return { ok: false, error: "A package with this URL already exists." };
    }
    logger.error("update-package failed", { tenantId, packageId, error: String(err) });
    throw err;
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "update",
      entity: "package",
      entityId: packageId,
      metadata: { name: parsed.data.name, fields: "details" },
    },
  });

  logger.info("package details updated", { tenantId, packageId });
  return { ok: true };
}
