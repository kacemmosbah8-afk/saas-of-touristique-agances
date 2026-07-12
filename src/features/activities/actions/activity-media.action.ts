"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { writeAudit } from "@/shared/lib/audit";
import {
  activityCoverSchema,
  activityImageSchema,
  type ActivityCoverInput,
  type ActivityImageInput,
} from "@/features/activities/schemas/activity.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updateActivityCoverAction(
  tenantId: string,
  activityId: string,
  input: ActivityCoverInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "activity", "update");
  const parsed = activityCoverSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid image." };

  try {
    await db.activity.update({
      where: { id: activityId, tenantId },
      data: { coverImageKey: parsed.data.fileKey, coverImageUrl: parsed.data.url },
    });
  } catch {
    return { ok: false, error: "Activity not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update-cover",
    entity: "activity",
    entityId: activityId,
  });
  return { ok: true };
}

export async function deleteActivityCoverAction(
  tenantId: string,
  activityId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "activity", "update");
  try {
    await db.activity.update({
      where: { id: activityId, tenantId },
      data: { coverImageKey: null, coverImageUrl: null },
    });
  } catch {
    return { ok: false, error: "Activity not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-cover",
    entity: "activity",
    entityId: activityId,
  });
  return { ok: true };
}

export async function addActivityImageAction(
  tenantId: string,
  activityId: string,
  input: ActivityImageInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "activity", "update");
  const parsed = activityImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid image." };

  const activity = await db.activity.findFirst({
    where: { id: activityId, tenantId },
    select: { id: true },
  });
  if (!activity) return { ok: false, error: "Activity not found." };

  const last = await db.activityImage.findFirst({
    where: { activityId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await db.activityImage.create({
    data: {
      tenantId,
      activityId,
      fileKey: parsed.data.fileKey,
      url: parsed.data.url,
      alt: parsed.data.alt ?? null,
      position: (last?.position ?? -1) + 1,
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "add-image",
    entity: "activity",
    entityId: activityId,
  });
  return { ok: true };
}

export async function deleteActivityImageAction(
  tenantId: string,
  imageId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "activity", "update");
  try {
    await db.activityImage.delete({ where: { id: imageId, tenantId } });
  } catch {
    return { ok: false, error: "Image not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-image",
    entity: "activity",
    entityId: imageId,
  });
  return { ok: true };
}
