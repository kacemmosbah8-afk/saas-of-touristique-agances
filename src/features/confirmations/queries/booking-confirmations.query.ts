import "server-only";

import type { ConfirmationStatus, BookingItemType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type ConfirmationView = {
  id: string;
  bookingItemId: string;
  itemDescription: string;
  itemType: BookingItemType;
  status: ConfirmationStatus;
  supplierName: string | null;
  confirmationNumber: string | null;
  requestedAt: Date;
  respondedAt: Date | null;
  notes: string | null;
};

export type ConfirmableItem = {
  id: string;
  type: BookingItemType;
  description: string;
  confirmation: ConfirmationView | null;
};

/** Every booking line with its supplier-confirmation state (null = never
 * requested), in line order — drives the confirmations table. */
export async function listBookingConfirmations(
  db: TenantDb,
  bookingId: string,
): Promise<ConfirmableItem[]> {
  const items = await db.bookingItem.findMany({
    where: { bookingId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      type: true,
      description: true,
      confirmation: true,
    },
  });

  return items.map((item) => ({
    id: item.id,
    type: item.type,
    description: item.description,
    confirmation: item.confirmation
      ? {
          id: item.confirmation.id,
          bookingItemId: item.id,
          itemDescription: item.description,
          itemType: item.type,
          status: item.confirmation.status,
          supplierName: item.confirmation.supplierName,
          confirmationNumber: item.confirmation.confirmationNumber,
          requestedAt: item.confirmation.requestedAt,
          respondedAt: item.confirmation.respondedAt,
          notes: item.confirmation.notes,
        }
      : null,
  }));
}
