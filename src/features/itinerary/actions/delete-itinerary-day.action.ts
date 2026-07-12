"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";

export async function deleteItineraryDayAction(
  tenantId: string,
  dayId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  let packageId: string;
  try {
    const day = await db.itineraryDay.delete({
      where: { id: dayId, tenantId },
      select: { packageId: true, dayNumber: true },
    });
    packageId = day.packageId;

    // Re-sequence remaining days to keep dayNumber contiguous
    const remaining = await db.itineraryDay.findMany({
      where: { packageId },
      orderBy: { dayNumber: "asc" },
      select: { id: true },
    });
    await Promise.all(
      remaining.map((d, i) =>
        db.itineraryDay.update({
          where: { id: d.id },
          data: { dayNumber: i + 1 },
        }),
      ),
    );
  } catch {
    return { ok: false, error: "Day not found." };
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "delete",
      entity: "itinerary_day",
      entityId: dayId,
      metadata: { packageId },
    },
  });

  logger.info("itinerary day deleted", { tenantId, dayId });
  return { ok: true };
}
