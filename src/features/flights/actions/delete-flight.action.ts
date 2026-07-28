"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import type { ActionResult } from "@/shared/types/action-result";

export async function deleteFlightAction(
  tenantId: string,
  flightId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "flight", "delete");

  try {
    await db.flight.update({
      where: { id: flightId, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { ok: false, error: "Flight not found." };
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "delete",
      entity: "flight",
      entityId: flightId,
    },
  });

  logger.info("flight deleted (soft)", { tenantId, flightId });
  return { ok: true };
}
