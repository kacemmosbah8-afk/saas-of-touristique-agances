"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import {
  destinationDetailsSchema,
  destinationSeoSchema,
  updateDestinationStatusSchema,
  destinationCoverSchema,
  destinationImageSchema,
  createDestinationWithMediaSchema,
  type DestinationDetailsInput,
  type DestinationSeoInput,
  type UpdateDestinationStatusInput,
  type DestinationCoverInput,
  type DestinationImageInput,
  type CreateDestinationWithMediaInput,
} from "@/features/destinations/schemas/destination.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function createDestinationAction(
  tenantId: string,
  input: CreateDestinationWithMediaInput,
): Promise<ActionResult<{ destinationId: string }>> {
  const { session, db } = await requirePermission(tenantId, "destination", "create");

  const parsed = createDestinationWithMediaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  let destination: { id: string };
  try {
    destination = await db.destination.create({
      data: {
        tenantId,
        // New destinations start INACTIVE (hidden from the public site)
        // rather than the schema's ACTIVE default — nothing goes live
        // until the admin explicitly activates it.
        status: "INACTIVE",
        name: d.name,
        slug: d.slug,
        featured: d.featured ?? false,
        country: d.country,
        region: emptyToNull(d.region),
        city: emptyToNull(d.city),
        description: emptyToNull(d.description),
        popularAttractions: d.popularAttractions ?? [],
        heroImageKey: d.coverImage?.fileKey ?? null,
        heroImageUrl: d.coverImage?.url ?? null,
      },
      select: { id: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A destination with this URL already exists in your workspace." };
    }
    logger.error("create-destination failed", { tenantId, error: String(err) });
    throw err;
  }

  if (d.images && d.images.length > 0) {
    await db.destinationImage.createMany({
      data: d.images.map((img, position) => ({
        tenantId,
        destinationId: destination.id,
        fileKey: img.fileKey,
        url: img.url,
        alt: img.alt ?? null,
        position,
      })),
    });
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "destination",
    entityId: destination.id,
    metadata: { name: d.name },
  });
  logger.info("destination created", { tenantId, destinationId: destination.id });
  return { ok: true, data: { destinationId: destination.id } };
}

export async function updateDestinationAction(
  tenantId: string,
  destinationId: string,
  input: DestinationDetailsInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "destination", "update");

  const parsed = destinationDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  try {
    await db.destination.update({
      where: { id: destinationId, tenantId },
      data: {
        name: d.name,
        nameFr: emptyToNull(d.nameFr),
        slug: d.slug,
        featured: d.featured ?? false,
        country: d.country,
        countryFr: emptyToNull(d.countryFr),
        region: emptyToNull(d.region),
        regionFr: emptyToNull(d.regionFr),
        city: emptyToNull(d.city),
        cityFr: emptyToNull(d.cityFr),
        description: emptyToNull(d.description),
        descriptionFr: emptyToNull(d.descriptionFr),
        popularAttractions: d.popularAttractions ?? [],
        popularAttractionsFr: d.popularAttractionsFr ?? [],
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A destination with this URL already exists in your workspace." };
    }
    return { ok: false, error: "Destination not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "destination",
    entityId: destinationId,
  });
  return { ok: true };
}

export async function updateDestinationSeoAction(
  tenantId: string,
  destinationId: string,
  input: DestinationSeoInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "destination", "update");

  const parsed = destinationSeoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.destination.update({
      where: { id: destinationId, tenantId },
      data: {
        seoTitle: emptyToNull(parsed.data.seoTitle),
        seoTitleFr: emptyToNull(parsed.data.seoTitleFr),
        seoDescription: emptyToNull(parsed.data.seoDescription),
        seoDescriptionFr: emptyToNull(parsed.data.seoDescriptionFr),
      },
    });
  } catch {
    return { ok: false, error: "Destination not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update-seo",
    entity: "destination",
    entityId: destinationId,
  });
  return { ok: true };
}

export async function updateDestinationStatusAction(
  tenantId: string,
  destinationId: string,
  input: UpdateDestinationStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "destination", "manage");

  const parsed = updateDestinationStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  try {
    await db.destination.update({
      where: { id: destinationId, tenantId },
      data: { status: parsed.data.status },
    });
  } catch {
    return { ok: false, error: "Destination not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "status",
    entity: "destination",
    entityId: destinationId,
    metadata: { status: parsed.data.status },
  });
  return { ok: true };
}

export async function deleteDestinationAction(
  tenantId: string,
  destinationId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "destination", "delete");

  try {
    await db.destination.update({
      where: { id: destinationId, tenantId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  } catch {
    return { ok: false, error: "Destination not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "destination",
    entityId: destinationId,
  });
  logger.info("destination deleted", { tenantId, destinationId });
  return { ok: true };
}

export async function updateDestinationCoverAction(
  tenantId: string,
  destinationId: string,
  input: DestinationCoverInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "destination", "update");
  const parsed = destinationCoverSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid image." };

  try {
    await db.destination.update({
      where: { id: destinationId, tenantId },
      data: { heroImageKey: parsed.data.fileKey, heroImageUrl: parsed.data.url },
    });
  } catch {
    return { ok: false, error: "Destination not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update-hero",
    entity: "destination",
    entityId: destinationId,
  });
  return { ok: true };
}

export async function deleteDestinationCoverAction(
  tenantId: string,
  destinationId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "destination", "update");
  try {
    await db.destination.update({
      where: { id: destinationId, tenantId },
      data: { heroImageKey: null, heroImageUrl: null },
    });
  } catch {
    return { ok: false, error: "Destination not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-hero",
    entity: "destination",
    entityId: destinationId,
  });
  return { ok: true };
}

export async function addDestinationImageAction(
  tenantId: string,
  destinationId: string,
  input: DestinationImageInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "destination", "update");
  const parsed = destinationImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid image." };

  const destination = await db.destination.findFirst({
    where: { id: destinationId, tenantId },
    select: { id: true },
  });
  if (!destination) return { ok: false, error: "Destination not found." };

  const last = await db.destinationImage.findFirst({
    where: { destinationId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await db.destinationImage.create({
    data: {
      tenantId,
      destinationId,
      fileKey: parsed.data.fileKey,
      url: parsed.data.url,
      alt: parsed.data.alt ?? null,
      position: (last?.position ?? -1) + 1,
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "add-image",
    entity: "destination",
    entityId: destinationId,
  });
  return { ok: true };
}

export async function deleteDestinationImageAction(
  tenantId: string,
  imageId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "destination", "update");
  try {
    await db.destinationImage.delete({ where: { id: imageId, tenantId } });
  } catch {
    return { ok: false, error: "Image not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-image",
    entity: "destination",
    entityId: imageId,
  });
  return { ok: true };
}
