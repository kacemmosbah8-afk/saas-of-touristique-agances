"use server";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull } from "@/shared/lib/normalize";
import type { ActionResult } from "@/shared/types/action-result";
import {
  travellerFormSchema,
  type TravellerFormInput,
} from "@/features/travellers/schemas/traveller.schema";

type TenantDbFrom = Awaited<ReturnType<typeof requirePermission>>["db"];

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function travellerData(d: TravellerFormInput) {
  return {
    type: d.type,
    firstName: d.firstName,
    lastName: d.lastName,
    gender: d.gender,
    dateOfBirth: parseDate(d.dateOfBirth || undefined),
    nationality: emptyToNull(d.nationality),
    passportNumber: emptyToNull(d.passportNumber),
    passportIssuingCountry: emptyToNull(d.passportIssuingCountry),
    passportIssueDate: parseDate(d.passportIssueDate || undefined),
    passportExpiry: parseDate(d.passportExpiry || undefined),
    visaStatus: d.visaStatus,
    visaNotes: emptyToNull(d.visaNotes),
    emergencyContactName: emptyToNull(d.emergencyContactName),
    emergencyContactPhone: emptyToNull(d.emergencyContactPhone),
    emergencyContactRelation: emptyToNull(d.emergencyContactRelation),
    specialRequests: emptyToNull(d.specialRequests),
    medicalNotes: emptyToNull(d.medicalNotes),
    frequentFlyerAirline: emptyToNull(d.frequentFlyerAirline),
    frequentFlyerNumber: emptyToNull(d.frequentFlyerNumber),
  };
}

/** Travellers live on non-deleted bookings; cancelled bookings keep their
 * list readable but frozen. */
async function requireOpenBooking(
  db: TenantDbFrom,
  tenantId: string,
  bookingId: string,
): Promise<ActionResult<{ ok: true }>> {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, tenantId, deletedAt: null },
    select: { status: true },
  });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status === "CANCELLED") {
    return { ok: false, error: "A cancelled booking's travellers can't be changed." };
  }
  return { ok: true, data: { ok: true } };
}

export async function addTravellerAction(
  tenantId: string,
  bookingId: string,
  input: TravellerFormInput,
): Promise<ActionResult<{ travellerId: string }>> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = travellerFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid traveller." };
  }

  const guard = await requireOpenBooking(db, tenantId, bookingId);
  if (!guard.ok) return guard;

  // The first traveller on a booking is automatically the primary contact.
  const count = await db.bookingTraveller.count({ where: { bookingId } });

  const traveller = await db.bookingTraveller.create({
    data: {
      tenantId,
      bookingId,
      ...travellerData(parsed.data),
      isPrimary: count === 0,
    },
    select: { id: true, firstName: true, lastName: true },
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "UPDATED",
      title: `Traveller added: ${traveller.firstName} ${traveller.lastName}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "traveller_add",
    entity: "booking",
    entityId: bookingId,
    metadata: { travellerId: traveller.id },
  });
  logger.info("traveller added", { tenantId, bookingId, travellerId: traveller.id });
  return { ok: true, data: { travellerId: traveller.id } };
}

export async function updateTravellerAction(
  tenantId: string,
  bookingId: string,
  travellerId: string,
  input: TravellerFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const parsed = travellerFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid traveller." };
  }

  const guard = await requireOpenBooking(db, tenantId, bookingId);
  if (!guard.ok) return guard;

  const existing = await db.bookingTraveller.findFirst({
    where: { id: travellerId, bookingId, tenantId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Traveller not found." };

  await db.bookingTraveller.update({
    where: { id: travellerId },
    data: travellerData(parsed.data),
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "UPDATED",
      title: `Traveller updated: ${parsed.data.firstName} ${parsed.data.lastName}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "traveller_update",
    entity: "booking",
    entityId: bookingId,
    metadata: { travellerId },
  });
  return { ok: true };
}

export async function removeTravellerAction(
  tenantId: string,
  bookingId: string,
  travellerId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const guard = await requireOpenBooking(db, tenantId, bookingId);
  if (!guard.ok) return guard;

  const existing = await db.bookingTraveller.findFirst({
    where: { id: travellerId, bookingId, tenantId },
    select: { firstName: true, lastName: true, isPrimary: true },
  });
  if (!existing) return { ok: false, error: "Traveller not found." };

  await db.bookingTraveller.delete({ where: { id: travellerId } });

  // Keep the primary invariant: if the primary left, promote the oldest
  // remaining traveller.
  if (existing.isPrimary) {
    const next = await db.bookingTraveller.findFirst({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (next) {
      await db.bookingTraveller.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "UPDATED",
      title: `Traveller removed: ${existing.firstName} ${existing.lastName}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "traveller_remove",
    entity: "booking",
    entityId: bookingId,
    metadata: { travellerId },
  });
  return { ok: true };
}

/** Designate a traveller as the booking's primary contact. Exactly one
 * traveller is primary — the flag moves atomically. */
export async function setPrimaryTravellerAction(
  tenantId: string,
  bookingId: string,
  travellerId: string,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "booking", "update");

  const guard = await requireOpenBooking(db, tenantId, bookingId);
  if (!guard.ok) return guard;

  const existing = await db.bookingTraveller.findFirst({
    where: { id: travellerId, bookingId, tenantId },
    select: { id: true, isPrimary: true, firstName: true, lastName: true },
  });
  if (!existing) return { ok: false, error: "Traveller not found." };
  if (existing.isPrimary) return { ok: true };

  await db.bookingTraveller.updateMany({
    where: { bookingId, isPrimary: true },
    data: { isPrimary: false },
  });
  await db.bookingTraveller.update({
    where: { id: travellerId },
    data: { isPrimary: true },
  });

  await db.bookingActivity.create({
    data: {
      tenantId,
      bookingId,
      userId: session.user.id,
      type: "UPDATED",
      title: `Primary traveller: ${existing.firstName} ${existing.lastName}`,
    },
  });
  await writeAudit(db, {
    userId: session.user.id,
    action: "traveller_set_primary",
    entity: "booking",
    entityId: bookingId,
    metadata: { travellerId },
  });
  return { ok: true };
}
