"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import {
  updateHotelStatusSchema,
  type UpdateHotelStatusInput,
} from "@/features/hotels/schemas/hotel.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updateHotelStatusAction(
  tenantId: string,
  hotelId: string,
  input: UpdateHotelStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "hotel", "manage");

  const parsed = updateHotelStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid status." };
  }

  try {
    await db.hotel.update({
      where: { id: hotelId, tenantId },
      data: { status: parsed.data.status },
    });
  } catch {
    return { ok: false, error: "Hotel not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "status",
    entity: "hotel",
    entityId: hotelId,
    metadata: { status: parsed.data.status },
  });

  logger.info("hotel status updated", { tenantId, hotelId, status: parsed.data.status });
  return { ok: true };
}
