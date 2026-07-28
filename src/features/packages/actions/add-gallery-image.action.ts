"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  addGalleryImageSchema,
  type AddGalleryImageInput,
} from "@/features/packages/schemas/package.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function addGalleryImageAction(
  tenantId: string,
  packageId: string,
  input: AddGalleryImageInput,
): Promise<ActionResult<{ imageId: string }>> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = addGalleryImageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid image data." };
  }

  // Verify package belongs to this tenant and is not deleted
  const pkg = await db.package.findFirst({
    where: { id: packageId, deletedAt: null },
    select: { id: true },
  });
  if (!pkg) return { ok: false, error: "Package not found." };

  // Determine next position
  const lastImage = await db.packageImage.findFirst({
    where: { packageId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (lastImage?.position ?? -1) + 1;

  const image = await db.packageImage.create({
    data: {
      tenantId,
      packageId,
      fileKey: parsed.data.fileKey,
      url: parsed.data.url,
      alt: parsed.data.alt ?? null,
      position,
    },
    select: { id: true },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "update",
      entity: "package",
      entityId: packageId,
      metadata: { fields: "gallery_add", imageId: image.id },
    },
  });

  logger.info("gallery image added", { tenantId, packageId, imageId: image.id });
  return { ok: true, data: { imageId: image.id } };
}
