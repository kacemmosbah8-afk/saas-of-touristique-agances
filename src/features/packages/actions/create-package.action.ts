"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  createPackageSchema,
  type CreatePackageInput,
} from "@/features/packages/schemas/package.schema";
import type { ActionResult } from "@/shared/types/action-result";

type CreatePackageData = { packageId: string; slug: string };

export async function createPackageAction(
  tenantId: string,
  input: CreatePackageInput,
): Promise<ActionResult<CreatePackageData>> {
  const { session, db } = await requirePermission(tenantId, "package", "create");

  const parsed = createPackageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let pkg: { id: string; slug: string };

  try {
    pkg = await db.package.create({
      data: {
        tenantId,
        name: parsed.data.name,
        slug: parsed.data.slug,
      },
      select: { id: true, slug: true },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "A package with this URL already exists in your workspace." };
    }
    logger.error("create-package failed", { tenantId, error: String(err) });
    throw err;
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "create",
      entity: "package",
      entityId: pkg.id,
      metadata: { name: parsed.data.name, slug: parsed.data.slug },
    },
  });

  logger.info("package created", { tenantId, packageId: pkg.id, slug: pkg.slug });
  return { ok: true, data: { packageId: pkg.id, slug: pkg.slug } };
}
