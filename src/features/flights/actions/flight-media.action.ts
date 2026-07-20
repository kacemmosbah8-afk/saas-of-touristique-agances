"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { writeAudit } from "@/shared/lib/audit";
import {
  flightCoverSchema,
  flightImageSchema,
  type FlightCoverInput,
  type FlightImageInput,
} from "@/features/flights/schemas/flight.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updateFlightCoverAction(
  tenantId: string,
  flightId: string,
  input: FlightCoverInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "flight", "update");
  const parsed = flightCoverSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid image." };

  try {
    await db.flight.update({
      where: { id: flightId, tenantId },
      data: { coverImageKey: parsed.data.fileKey, coverImageUrl: parsed.data.url },
    });
  } catch {
    return { ok: false, error: "Flight not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update-cover",
    entity: "flight",
    entityId: flightId,
  });
  return { ok: true };
}

export async function deleteFlightCoverAction(
  tenantId: string,
  flightId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "flight", "update");
  try {
    await db.flight.update({
      where: { id: flightId, tenantId },
      data: { coverImageKey: null, coverImageUrl: null },
    });
  } catch {
    return { ok: false, error: "Flight not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-cover",
    entity: "flight",
    entityId: flightId,
  });
  return { ok: true };
}

export async function addFlightImageAction(
  tenantId: string,
  flightId: string,
  input: FlightImageInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "flight", "update");
  const parsed = flightImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid image." };

  const flight = await db.flight.findFirst({
    where: { id: flightId, tenantId },
    select: { id: true },
  });
  if (!flight) return { ok: false, error: "Flight not found." };

  const last = await db.flightImage.findFirst({
    where: { flightId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await db.flightImage.create({
    data: {
      tenantId,
      flightId,
      fileKey: parsed.data.fileKey,
      url: parsed.data.url,
      alt: parsed.data.alt ?? null,
      position: (last?.position ?? -1) + 1,
    },
  });

  await writeAudit(db, {
    userId: session.user.id,
    action: "add-image",
    entity: "flight",
    entityId: flightId,
  });
  return { ok: true };
}

export async function deleteFlightImageAction(
  tenantId: string,
  imageId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "flight", "update");
  try {
    await db.flightImage.delete({ where: { id: imageId, tenantId } });
  } catch {
    return { ok: false, error: "Image not found." };
  }
  await writeAudit(db, {
    userId: session.user.id,
    action: "delete-image",
    entity: "flight",
    entityId: imageId,
  });
  return { ok: true };
}
