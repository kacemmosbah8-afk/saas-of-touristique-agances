"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull, numOrNull } from "@/shared/lib/normalize";
import {
  roomTypeFormSchema,
  type RoomTypeFormInput,
} from "@/features/hotels/schemas/hotel.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function createRoomTypeAction(
  tenantId: string,
  hotelId: string,
  input: RoomTypeFormInput,
): Promise<ActionResult<{ roomTypeId: string }>> {
  const { session, db } = await requirePermission(tenantId, "hotel", "update");

  const parsed = roomTypeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  const hotel = await db.hotel.findFirst({
    where: { id: hotelId, tenantId },
    select: { id: true },
  });
  if (!hotel) return { ok: false, error: "Hotel not found." };

  const last = await db.roomType.findFirst({
    where: { hotelId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const room = await db.roomType.create({
    data: {
      tenantId,
      hotelId,
      kind: d.kind,
      name: d.name,
      capacity: d.capacity,
      beds: numOrNull(d.beds),
      occupancy: numOrNull(d.occupancy),
      basePrice: d.basePrice ?? null,
      internalCost: d.internalCost ?? null,
      currency: d.currency,
      images: d.images ?? [],
      notes: emptyToNull(d.notes),
      position: (last?.position ?? -1) + 1,
    },
    select: { id: true },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "room_type",
    entityId: room.id,
    metadata: { hotelId, name: d.name },
  });

  logger.info("room type created", { tenantId, hotelId, roomTypeId: room.id });
  return { ok: true, data: { roomTypeId: room.id } };
}

export async function updateRoomTypeAction(
  tenantId: string,
  roomTypeId: string,
  input: RoomTypeFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "hotel", "update");

  const parsed = roomTypeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  try {
    await db.roomType.update({
      where: { id: roomTypeId, tenantId },
      data: {
        kind: d.kind,
        name: d.name,
        capacity: d.capacity,
        beds: numOrNull(d.beds),
        occupancy: numOrNull(d.occupancy),
        basePrice: d.basePrice ?? null,
        internalCost: d.internalCost ?? null,
        currency: d.currency,
        images: d.images ?? [],
        notes: emptyToNull(d.notes),
      },
    });
  } catch {
    return { ok: false, error: "Room type not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "room_type",
    entityId: roomTypeId,
  });
  return { ok: true };
}

export async function deleteRoomTypeAction(
  tenantId: string,
  roomTypeId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "hotel", "update");

  try {
    await db.roomType.delete({ where: { id: roomTypeId, tenantId } });
  } catch {
    return { ok: false, error: "Room type not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "delete",
    entity: "room_type",
    entityId: roomTypeId,
  });
  return { ok: true };
}
