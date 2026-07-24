"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  updateItineraryDaySchema,
  type UpdateItineraryDayInput,
} from "@/features/itinerary/schemas/itinerary.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updateItineraryDayAction(
  tenantId: string,
  dayId: string,
  input: UpdateItineraryDayInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = updateItineraryDaySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.itineraryDay.update({
      where: { id: dayId, tenantId },
      data: {
        title: parsed.data.title,
        titleFr: parsed.data.titleFr ?? null,
        description: parsed.data.description ?? null,
        descriptionFr: parsed.data.descriptionFr ?? null,
        notes: parsed.data.notes ?? null,
        mealBreakfast: parsed.data.mealBreakfast ?? null,
        mealBreakfastFr: parsed.data.mealBreakfastFr ?? null,
        mealLunch: parsed.data.mealLunch ?? null,
        mealLunchFr: parsed.data.mealLunchFr ?? null,
        mealDinner: parsed.data.mealDinner ?? null,
        mealDinnerFr: parsed.data.mealDinnerFr ?? null,
        transferNotes: parsed.data.transferNotes ?? null,
        transferNotesFr: parsed.data.transferNotesFr ?? null,
        accommodationNotes: parsed.data.accommodationNotes ?? null,
        accommodationNotesFr: parsed.data.accommodationNotesFr ?? null,
      },
    });
  } catch {
    return { ok: false, error: "Day not found." };
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "update",
      entity: "itinerary_day",
      entityId: dayId,
    },
  });

  logger.info("itinerary day updated", { tenantId, dayId });
  return { ok: true };
}
