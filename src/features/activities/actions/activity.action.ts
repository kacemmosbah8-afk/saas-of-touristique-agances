"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull, numOrNull } from "@/shared/lib/normalize";
import type { TenantDb } from "@/shared/lib/db";
import {
  activityFormSchema,
  updateActivityStatusSchema,
  createActivityWithMediaSchema,
  type ActivityFormInput,
  type UpdateActivityStatusInput,
  type CreateActivityWithMediaInput,
} from "@/features/activities/schemas/activity.schema";
import type { ActionResult } from "@/shared/types/action-result";

async function resolveSupplierId(
  db: TenantDb,
  tenantId: string,
  supplierId: string | undefined,
): Promise<string | null> {
  if (!supplierId) return null;
  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, tenantId },
    select: { id: true },
  });
  return supplier?.id ?? null;
}

function toData(d: ActivityFormInput, supplierId: string | null) {
  return {
    name: d.name,
    nameFr: emptyToNull(d.nameFr),
    slug: d.slug,
    featured: d.featured ?? false,
    category: emptyToNull(d.category),
    categoryFr: emptyToNull(d.categoryFr),
    durationMinutes: numOrNull(d.durationMinutes),
    meetingPoint: emptyToNull(d.meetingPoint),
    meetingPointFr: emptyToNull(d.meetingPointFr),
    description: emptyToNull(d.description),
    descriptionFr: emptyToNull(d.descriptionFr),
    includedItems: d.includedItems ?? [],
    includedItemsFr: d.includedItemsFr ?? [],
    excludedItems: d.excludedItems ?? [],
    excludedItemsFr: d.excludedItemsFr ?? [],
    country: emptyToNull(d.country),
    countryFr: emptyToNull(d.countryFr),
    city: emptyToNull(d.city),
    cityFr: emptyToNull(d.cityFr),
    supplierId,
    internalCost: d.internalCost ?? null,
    sellingPrice: d.sellingPrice ?? null,
    currency: d.currency,
  };
}

export async function createActivityCatalogAction(
  tenantId: string,
  input: CreateActivityWithMediaInput,
): Promise<ActionResult<{ activityId: string }>> {
  const { session, db } = await requirePermission(tenantId, "activity", "create");

  const parsed = createActivityWithMediaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supplierId = await resolveSupplierId(db, tenantId, parsed.data.supplierId || undefined);

  let activity: { id: string };
  try {
    activity = await db.activity.create({
      data: {
        tenantId,
        ...toData(parsed.data, supplierId),
        // New activities start INACTIVE (hidden from the public site)
        // rather than the schema's ACTIVE default — nothing goes live
        // until the admin explicitly activates it.
        status: "INACTIVE",
        coverImageKey: parsed.data.coverImage?.fileKey ?? null,
        coverImageUrl: parsed.data.coverImage?.url ?? null,
      },
      select: { id: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "An activity with this URL already exists in your workspace." };
    }
    logger.error("create-activity failed", { tenantId, error: String(err) });
    throw err;
  }

  if (parsed.data.images && parsed.data.images.length > 0) {
    await db.activityImage.createMany({
      data: parsed.data.images.map((img, position) => ({
        tenantId,
        activityId: activity.id,
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
    entity: "activity",
    entityId: activity.id,
    metadata: { name: parsed.data.name },
  });
  logger.info("activity created", { tenantId, activityId: activity.id });
  return { ok: true, data: { activityId: activity.id } };
}

export async function updateActivityCatalogAction(
  tenantId: string,
  activityId: string,
  input: ActivityFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "activity", "update");

  const parsed = activityFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supplierId = await resolveSupplierId(db, tenantId, parsed.data.supplierId || undefined);

  try {
    await db.activity.update({
      where: { id: activityId, tenantId },
      data: toData(parsed.data, supplierId),
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "An activity with this URL already exists in your workspace." };
    }
    return { ok: false, error: "Activity not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "activity",
    entityId: activityId,
  });
  return { ok: true };
}

export async function updateActivityStatusAction(
  tenantId: string,
  activityId: string,
  input: UpdateActivityStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "activity", "manage");

  const parsed = updateActivityStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  try {
    await db.activity.update({
      where: { id: activityId, tenantId },
      data: { status: parsed.data.status },
    });
  } catch {
    return { ok: false, error: "Activity not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "status",
    entity: "activity",
    entityId: activityId,
    metadata: { status: parsed.data.status },
  });
  return { ok: true };
}

export async function deleteActivityCatalogAction(
  tenantId: string,
  activityId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "activity", "delete");

  try {
    await db.activity.update({
      where: { id: activityId, tenantId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  } catch {
    return { ok: false, error: "Activity not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "activity",
    entityId: activityId,
  });
  logger.info("activity deleted", { tenantId, activityId });
  return { ok: true };
}
