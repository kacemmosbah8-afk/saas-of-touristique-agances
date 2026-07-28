"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import {
  hotelCoverSchema,
  hotelImageSchema,
  type HotelCoverInput,
  type HotelImageInput,
} from "@/features/hotels/schemas/hotel.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updateHotelCoverAction(
  tenantId: string,
  hotelId: string,
  input: HotelCoverInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "hotel", "update");

  const parsed = hotelCoverSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid image." };

  try {
    await db.hotel.update({
      where: { id: hotelId, tenantId },
      data: { coverImageKey: parsed.data.fileKey, coverImageUrl: parsed.data.url },
    });
  } catch {
    return { ok: false, error: "Hotel not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update-cover",
    entity: "hotel",
    entityId: hotelId,
  });
  logger.info("hotel cover updated", { tenantId, hotelId });
  return { ok: true };
}

export async function deleteHotelCoverAction(
  tenantId: string,
  hotelId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "hotel", "update");

  try {
    await db.hotel.update({
      where: { id: hotelId, tenantId },
      data: { coverImageKey: null, coverImageUrl: null },
    });
  } catch {
    return { ok: false, error: "Hotel not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-cover",
    entity: "hotel",
    entityId: hotelId,
  });
  return { ok: true };
}

export async function addHotelImageAction(
  tenantId: string,
  hotelId: string,
  input: HotelImageInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "hotel", "update");

  const parsed = hotelImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid image." };

  const hotel = await db.hotel.findFirst({
    where: { id: hotelId, tenantId },
    select: { id: true },
  });
  if (!hotel) return { ok: false, error: "Hotel not found." };

  const last = await db.hotelImage.findFirst({
    where: { hotelId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await db.hotelImage.create({
    data: {
      tenantId,
      hotelId,
      fileKey: parsed.data.fileKey,
      url: parsed.data.url,
      alt: parsed.data.alt ?? null,
      position: (last?.position ?? -1) + 1,
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "add-image",
    entity: "hotel",
    entityId: hotelId,
  });
  return { ok: true };
}

export async function deleteHotelImageAction(
  tenantId: string,
  imageId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "hotel", "update");

  try {
    await db.hotelImage.delete({ where: { id: imageId, tenantId } });
  } catch {
    return { ok: false, error: "Image not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-image",
    entity: "hotel",
    entityId: imageId,
  });
  return { ok: true };
}
