"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull, numOrNull } from "@/shared/lib/normalize";
import {
  hotelFormSchema,
  type HotelFormInput,
} from "@/features/hotels/schemas/hotel.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function updateHotelAction(
  tenantId: string,
  hotelId: string,
  input: HotelFormInput,
): Promise<ActionResult> {
  const { session, db } = await requirePermission(tenantId, "hotel", "update");

  const parsed = hotelFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  try {
    await db.hotel.update({
      where: { id: hotelId, tenantId },
      data: {
        name: d.name,
        nameFr: emptyToNull(d.nameFr),
        slug: d.slug,
        featured: d.featured ?? false,
        category: d.category,
        stars: numOrNull(d.stars),
        country: emptyToNull(d.country),
        countryFr: emptyToNull(d.countryFr),
        city: emptyToNull(d.city),
        cityFr: emptyToNull(d.cityFr),
        address: emptyToNull(d.address),
        addressFr: emptyToNull(d.addressFr),
        latitude: numOrNull(d.latitude),
        longitude: numOrNull(d.longitude),
        description: emptyToNull(d.description),
        descriptionFr: emptyToNull(d.descriptionFr),
        amenities: d.amenities ?? [],
        amenitiesFr: d.amenitiesFr ?? [],
        contactName: emptyToNull(d.contactName),
        contactEmail: emptyToNull(d.contactEmail),
        contactPhone: emptyToNull(d.contactPhone),
        website: emptyToNull(d.website),
        internalNotes: emptyToNull(d.internalNotes),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A hotel with this URL already exists in your workspace." };
    }
    return { ok: false, error: "Hotel not found." };
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "update",
    entity: "hotel",
    entityId: hotelId,
  });

  logger.info("hotel updated", { tenantId, hotelId });
  return { ok: true };
}
