"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  updatePackageSchema,
  type UpdatePackageInput,
} from "@/features/packages/schemas/package.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updatePackageAction(
  tenantId: string,
  packageId: string,
  input: UpdatePackageInput,
): Promise<ActionResult> {
  const { db } = await requirePermission(tenantId, "package", "update");

  const parsed = updatePackageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.package.update({
      where: { id: packageId, tenantId, deletedAt: null },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description ?? null,
        duration: parsed.data.duration ?? null,
        destination: parsed.data.destination ?? null,
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

  logger.info("package updated", { tenantId, packageId });
  return { ok: true };
}
