"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";

export async function deleteActivityAction(
  tenantId: string,
  activityId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  let dayId: string;
  try {
    const activity = await db.itineraryActivity.delete({
      where: { id: activityId, tenantId },
      select: { dayId: true, position: true },
    });
    dayId = activity.dayId;

    // Re-sequence remaining activities
    const remaining = await db.itineraryActivity.findMany({
      where: { dayId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    await Promise.all(
      remaining.map((a, i) =>
        db.itineraryActivity.update({
          where: { id: a.id },
          data: { position: i },
        }),
      ),
    );
  } catch {
    return { ok: false, error: "Activity not found." };
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "delete",
      entity: "itinerary_activity",
      entityId: activityId,
      metadata: { dayId },
    },
  });

  logger.info("activity deleted", { tenantId, activityId });
  return { ok: true };
}
