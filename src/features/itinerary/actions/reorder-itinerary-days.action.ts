"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  reorderItineraryDaysSchema,
  type ReorderItineraryDaysInput,
} from "@/features/itinerary/schemas/itinerary.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function reorderItineraryDaysAction(
  tenantId: string,
  packageId: string,
  input: ReorderItineraryDaysInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = reorderItineraryDaysSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  // Verify all IDs belong to this tenant+package
  const days = await db.itineraryDay.findMany({
    where: { packageId, tenantId },
    select: { id: true },
  });
  const existingIds = new Set(days.map((d) => d.id));
  if (!parsed.data.orderedIds.every((id) => existingIds.has(id))) {
    return { ok: false, error: "Invalid day IDs." };
  }

  await Promise.all(
    parsed.data.orderedIds.map((id, i) =>
      db.itineraryDay.update({
        where: { id, tenantId },
        data: { dayNumber: i + 1 },
      }),
    ),
  );

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "reorder",
      entity: "itinerary_day",
      entityId: packageId,
      metadata: { packageId, count: parsed.data.orderedIds.length },
    },
  });

  logger.info("itinerary days reordered", { tenantId, packageId });
  return { ok: true };
}
