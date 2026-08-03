"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  updateFlightStatusSchema,
  type UpdateFlightStatusInput,
} from "@/features/flights/schemas/flight.schema";
import { getMissingPublishRequirements } from "@/features/flights/lib/publish-requirements";
import { toNumber } from "@/shared/lib/list-query";
import type { ActionResult } from "@/shared/types/action-result";

export async function updateFlightStatusAction(
  tenantId: string,
  flightId: string,
  input: UpdateFlightStatusInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "flight", "manage");

  const parsed = updateFlightStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid status." };
  }

  if (parsed.data.status === "PUBLISHED") {
    const flight = await db.flight.findFirst({
      where: { id: flightId, tenantId, deletedAt: null },
      select: {
        basePrice: true,
        coverImageUrl: true,
        _count: { select: { images: true } },
      },
    });
    if (!flight) return { ok: false, error: "Flight not found." };

    const missing = getMissingPublishRequirements({
      basePrice: toNumber(flight.basePrice),
      coverImageUrl: flight.coverImageUrl,
      imageCount: flight._count.images,
    });
    if (missing.length > 0) {
      return { ok: false, error: `Add ${missing.join(", ")} before publishing.` };
    }
  }

  try {
    await db.flight.update({
      where: { id: flightId, tenantId, deletedAt: null },
      data: { status: parsed.data.status },
    });
  } catch {
    return { ok: false, error: "Flight not found." };
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "status_change",
      entity: "flight",
      entityId: flightId,
      metadata: { status: parsed.data.status },
    },
  });

  logger.info("flight status updated", { tenantId, flightId, status: parsed.data.status });
  return { ok: true };
}
