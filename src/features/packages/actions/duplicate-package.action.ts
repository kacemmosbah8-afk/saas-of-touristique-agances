"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function duplicatePackageAction(
  tenantId: string,
  packageId: string,
): Promise<ActionResult<{ packageId: string; slug: string }>> {
  const { session, db } = await requirePermission(tenantId, "package", "create");

  const source = await db.package.findFirst({
    where: { id: packageId, deletedAt: null },
  });
  if (!source) return { ok: false, error: "Package not found." };

  const baseName = `Copy of ${source.name}`;
  const baseSlug = slugify(`copy-of-${source.slug}`);

  // Find a unique slug by appending -2, -3, etc. if needed
  let slug = baseSlug;
  let attempt = 1;
  while (true) {
    const existing = await db.package.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!existing) break;
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  let newPkg: { id: string; slug: string };

  try {
    newPkg = await db.package.create({
      data: {
        tenantId,
        name: baseName,
        slug,
        shortDescription: source.shortDescription,
        description: source.description,
        destination: source.destination,
        country: source.country,
        duration: source.duration,
        durationNights: source.durationNights,
        category: source.category,
        difficulty: source.difficulty,
        featured: false,
        highlights: source.highlights,
        includedServices: source.includedServices,
        excludedServices: source.excludedServices,
        importantNotes: source.importantNotes,
        whatToBring: source.whatToBring,
        cancellationPolicy: source.cancellationPolicy,
        meetingPoint: source.meetingPoint,
        seoTitle: null,
        seoDescription: null,
        status: "DRAFT",
      },
      select: { id: true, slug: true },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "Could not generate a unique slug for the copy." };
    }
    logger.error("duplicate-package failed", { tenantId, packageId, error: String(err) });
    throw err;
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "duplicate",
      entity: "package",
      entityId: newPkg.id,
      metadata: { sourceId: packageId, name: baseName, slug },
    },
  });

  logger.info("package duplicated", { tenantId, sourceId: packageId, newId: newPkg.id });
  return { ok: true, data: { packageId: newPkg.id, slug: newPkg.slug } };
}
