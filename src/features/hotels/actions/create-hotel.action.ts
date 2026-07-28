"use server";

import { Prisma } from "@prisma/client";

import { requirePermission } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import { writeAudit } from "@/shared/lib/audit";
import { emptyToNull, numOrNull } from "@/shared/lib/normalize";
import {
  createHotelWithMediaSchema,
  type CreateHotelWithMediaInput,
} from "@/features/hotels/schemas/hotel.schema";
import type { ActionResult } from "@/shared/types/action-result";

export async function createHotelAction(
  tenantId: string,
  input: CreateHotelWithMediaInput,
): Promise<ActionResult<{ hotelId: string }>> {
  const { session, db } = await requirePermission(tenantId, "hotel", "create");

  const parsed = createHotelWithMediaSchema.safeParse(input);
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
        coverImageKey: d.coverImage?.fileKey ?? null,
        coverImageUrl: d.coverImage?.url ?? null,
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

  if (d.images && d.images.length > 0) {
    await db.hotelImage.createMany({
      data: d.images.map((img, position) => ({
        tenantId,
        hotelId: hotel.id,
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
    entity: "hotel",
    entityId: hotel.id,
    metadata: { name: d.name },
  });

  logger.info("hotel created", { tenantId, hotelId: hotel.id });
  return { ok: true, data: { hotelId: hotel.id } };
}
