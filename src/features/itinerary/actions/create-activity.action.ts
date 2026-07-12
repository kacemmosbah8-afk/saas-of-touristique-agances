"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  createActivitySchema,
  type CreateActivityInput,
} from "@/features/itinerary/schemas/itinerary.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function createActivityAction(
  tenantId: string,
  dayId: string,
  input: CreateActivityInput,
): Promise<ActionResult<{ activityId: string }>> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = createActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Verify day belongs to this tenant
  const day = await db.itineraryDay.findFirst({
    where: { id: dayId, tenantId },
    select: { id: true },
  });
  if (!day) return { ok: false, error: "Day not found." };

  // Next position = max existing + 1
  const last = await db.itineraryActivity.findFirst({
    where: { dayId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (last?.position ?? -1) + 1;

  const activity = await db.itineraryActivity.create({
    data: {
      tenantId,
      dayId,
      position,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      duration: parsed.data.duration ?? null,
    },
    select: { id: true },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "create",
      entity: "itinerary_activity",
      entityId: activity.id,
      metadata: { dayId, title: parsed.data.title },
    },
  });

  logger.info("activity created", { tenantId, dayId, activityId: activity.id });
  return { ok: true, data: { activityId: activity.id } };
}
