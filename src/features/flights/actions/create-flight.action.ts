"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull, numOrNull } from "@/shared/lib/normalize";
import {
  flightFormSchema,
  createFlightWithMediaSchema,
  type FlightFormInput,
  type CreateFlightWithMediaInput,
} from "@/features/flights/schemas/flight.schema";
import type { ActionResult } from "@/shared/types/action-result";

function toData(d: FlightFormInput) {
  return {
    name: d.name,
    nameFr: emptyToNull(d.nameFr),
    slug: d.slug,
    featured: d.featured ?? false,
    shortDescription: emptyToNull(d.shortDescription),
    shortDescriptionFr: emptyToNull(d.shortDescriptionFr),
    description: emptyToNull(d.description),
    descriptionFr: emptyToNull(d.descriptionFr),
    airline: emptyToNull(d.airline),
    flightNumber: emptyToNull(d.flightNumber),
    departureCity: emptyToNull(d.departureCity),
    departureCityFr: emptyToNull(d.departureCityFr),
    departureAirport: emptyToNull(d.departureAirport),
    departureAirportFr: emptyToNull(d.departureAirportFr),
    departureCountry: emptyToNull(d.departureCountry),
    departureCountryFr: emptyToNull(d.departureCountryFr),
    arrivalCity: emptyToNull(d.arrivalCity),
    arrivalCityFr: emptyToNull(d.arrivalCityFr),
    arrivalAirport: emptyToNull(d.arrivalAirport),
    arrivalAirportFr: emptyToNull(d.arrivalAirportFr),
    arrivalCountry: emptyToNull(d.arrivalCountry),
    arrivalCountryFr: emptyToNull(d.arrivalCountryFr),
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
  input: CreateFlightWithMediaInput,
): Promise<ActionResult<{ flightId: string }>> {
  const { session, db } = await requirePermission(tenantId, "flight", "create");

  const parsed = createFlightWithMediaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let flight: { id: string };
  try {
    flight = await db.flight.create({
      data: {
        tenantId,
        ...toData(parsed.data),
        coverImageKey: parsed.data.coverImage?.fileKey ?? null,
        coverImageUrl: parsed.data.coverImage?.url ?? null,
      },
      select: { id: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A flight with this URL already exists in your workspace." };
    }
    logger.error("create-flight failed", { tenantId, error: String(err) });
    throw err;
  }

  if (parsed.data.images && parsed.data.images.length > 0) {
    await db.flightImage.createMany({
      data: parsed.data.images.map((img, position) => ({
        tenantId,
        flightId: flight.id,
        fileKey: img.fileKey,
        url: img.url,
        alt: img.alt ?? null,
        position,
      })),
    });
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
