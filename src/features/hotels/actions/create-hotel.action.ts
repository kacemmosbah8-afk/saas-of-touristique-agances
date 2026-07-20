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

export async function createHotelAction(
  tenantId: string,
  input: HotelFormInput,
): Promise<ActionResult<{ hotelId: string }>> {
  const { session, db } = await requirePermission(tenantId, "hotel", "create");

  const parsed = hotelFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const d = parsed.data;

  let hotel: { id: string };
  try {
    hotel = await db.hotel.create({
      data: {
        tenantId,
        name: d.name,
        slug: d.slug,
        featured: d.featured ?? false,
        category: d.category,
        stars: numOrNull(d.stars),
        country: emptyToNull(d.country),
        city: emptyToNull(d.city),
        address: emptyToNull(d.address),
        latitude: numOrNull(d.latitude),
        longitude: numOrNull(d.longitude),
        description: emptyToNull(d.description),
        amenities: d.amenities ?? [],
        contactName: emptyToNull(d.contactName),
        contactEmail: emptyToNull(d.contactEmail),
        contactPhone: emptyToNull(d.contactPhone),
        website: emptyToNull(d.website),
        internalNotes: emptyToNull(d.internalNotes),
      },
      select: { id: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "A hotel with this URL already exists in your workspace." };
    }
    logger.error("create-hotel failed", { tenantId, error: String(err) });
    throw err;
  }

  await writeAudit(db, {
    userId: session.user.id,
    action: "create",
    entity: "hotel",
    entityId: hotel.id,
    metadata: { name: d.name },
  });

  logger.info("hotel created", { tenantId, hotelId: hotel.id });
  return { ok: true, data: { hotelId: hotel.id } };
}
