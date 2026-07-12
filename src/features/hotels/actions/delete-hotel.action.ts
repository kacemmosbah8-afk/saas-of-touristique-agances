"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import type { ActionResult } from "@/shared/types/action-result";

/** Soft-delete: sets the `deletedAt` tombstone. Lists filter these out. */
export async function deleteHotelAction(
  tenantId: string,
  hotelId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "hotel", "delete");

  try {
    await db.hotel.update({
      where: { id: hotelId, tenantId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  } catch {
    return { ok: false, error: "Hotel not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "hotel",
    entityId: hotelId,
  });

  logger.info("hotel deleted", { tenantId, hotelId });
  return { ok: true };
}
