"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  createItineraryDaySchema,
  type CreateItineraryDayInput,
} from "@/features/itinerary/schemas/itinerary.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function createItineraryDayAction(
  tenantId: string,
  packageId: string,
  input: CreateItineraryDayInput,
): Promise<ActionResult<{ dayId: string; dayNumber: number }>> {
  const { session, db } = await requirePermission(tenantId, "package", "update");

  const parsed = createItineraryDaySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Verify package belongs to this tenant
  const pkg = await db.package.findFirst({
    where: { id: packageId, deletedAt: null },
    select: { id: true },
  });
  if (!pkg) return { ok: false, error: "Package not found." };

  // Next day number = max existing + 1
  const last = await db.itineraryDay.findFirst({
    where: { packageId },
    orderBy: { dayNumber: "desc" },
    select: { dayNumber: true },
  });
  const dayNumber = (last?.dayNumber ?? 0) + 1;

  const day = await db.itineraryDay.create({
    data: {
      tenantId,
      packageId,
      dayNumber,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      notes: parsed.data.notes ?? null,
      mealBreakfast: parsed.data.mealBreakfast ?? null,
      mealLunch: parsed.data.mealLunch ?? null,
      mealDinner: parsed.data.mealDinner ?? null,
      transferNotes: parsed.data.transferNotes ?? null,
      accommodationNotes: parsed.data.accommodationNotes ?? null,
    },
    select: { id: true, dayNumber: true },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "create",
      entity: "itinerary_day",
      entityId: day.id,
      metadata: { packageId, dayNumber, title: parsed.data.title },
    },
  });

  logger.info("itinerary day created", { tenantId, packageId, dayId: day.id, dayNumber });
  return { ok: true, data: { dayId: day.id, dayNumber } };
}
