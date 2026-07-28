"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  updateActivitySchema,
  type UpdateActivityInput,
} from "@/features/itinerary/schemas/itinerary.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updateActivityAction(
  tenantId: string,
  activityId: string,
  input: UpdateActivityInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = updateActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.itineraryActivity.update({
      where: { id: activityId, tenantId },
      data: {
        title: parsed.data.title,
        titleFr: parsed.data.titleFr ?? null,
        description: parsed.data.description ?? null,
        descriptionFr: parsed.data.descriptionFr ?? null,
        duration: parsed.data.duration ?? null,
      },
    });
  } catch {
    return { ok: false, error: "Activity not found." };
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "update",
      entity: "itinerary_activity",
      entityId: activityId,
    },
  });

  logger.info("activity updated", { tenantId, activityId });
  return { ok: true };
}
