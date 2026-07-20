"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull, numOrNull } from "@/shared/lib/normalize";
import {
  flightFormSchema,
  type FlightFormInput,
} from "@/features/flights/schemas/flight.schema";
import type { ActionResult } from "@/shared/types/action-result";

function toData(d: FlightFormInput) {
  return {
    name: d.name,
    slug: d.slug,
    featured: d.featured ?? false,
    shortDescription: emptyToNull(d.shortDescription),
    description: emptyToNull(d.description),
    airline: emptyToNull(d.airline),
    flightNumber: emptyToNull(d.flightNumber),
    departureCity: emptyToNull(d.departureCity),
    departureAirport: emptyToNull(d.departureAirport),
    departureCountry: emptyToNull(d.departureCountry),
    arrivalCity: emptyToNull(d.arrivalCity),
    arrivalAirport: emptyToNull(d.arrivalAirport),
    arrivalCountry: emptyToNull(d.arrivalCountry),
    departureTime: emptyToNull(d.departureTime),
    arrivalTime: emptyToNull(d.arrivalTime),
    durationMinutes: numOrNull(d.durationMinutes),
    stops: d.stops ?? 0,
    cabinClass: d.cabinClass ? d.cabinClass : null,
    basePrice: d.basePrice ?? null,
    currency: d.currency,
  };
}

export async function createFlightAction(
  tenantId: string,
  input: FlightFormInput,
): Promise<ActionResult<{ flightId: string }>> {
  const { session, db } = await requirePermission(tenantId, "flight", "create");

  const parsed = flightFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let flight: { id: string };
  try {
    flight = await db.flight.create({
      data: { tenantId, ...toData(parsed.data) },
      select: { id: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A flight with this URL already exists in your workspace." };
    }
    logger.error("create-flight failed", { tenantId, error: String(err) });
    throw err;
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "flight",
    entityId: flight.id,
    metadata: { name: parsed.data.name },
  });
  logger.info("flight created", { tenantId, flightId: flight.id });
  return { ok: true, data: { flightId: flight.id } };
}

export async function updateFlightAction(
  tenantId: string,
  flightId: string,
  input: FlightFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "flight", "update");

  const parsed = flightFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await db.flight.update({
      where: { id: flightId, tenantId },
      data: toData(parsed.data),
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A flight with this URL already exists in your workspace." };
    }
    return { ok: false, error: "Flight not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "flight",
    entityId: flightId,
  });
  return { ok: true };
}
