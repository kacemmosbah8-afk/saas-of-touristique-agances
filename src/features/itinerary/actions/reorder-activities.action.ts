"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  reorderActivitiesSchema,
  type ReorderActivitiesInput,
} from "@/features/itinerary/schemas/itinerary.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function reorderActivitiesAction(
  tenantId: string,
  dayId: string,
  input: ReorderActivitiesInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = reorderActivitiesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  // Verify all IDs belong to this tenant+day
  const activities = await db.itineraryActivity.findMany({
    where: { dayId, tenantId },
    select: { id: true },
  });
  const existingIds = new Set(activities.map((a) => a.id));
  if (!parsed.data.orderedIds.every((id) => existingIds.has(id))) {
    return { ok: false, error: "Invalid activity IDs." };
  }

  await Promise.all(
    parsed.data.orderedIds.map((id, i) =>
      db.itineraryActivity.update({
        where: { id, tenantId },
        data: { position: i },
      }),
    ),
  );

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "reorder",
      entity: "itinerary_activity",
      entityId: dayId,
      metadata: { dayId, count: parsed.data.orderedIds.length },
    },
  });

  logger.info("activities reordered", { tenantId, dayId });
  return { ok: true };
}
