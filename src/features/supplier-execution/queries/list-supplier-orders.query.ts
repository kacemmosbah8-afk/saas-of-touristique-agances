import "server-only";

import type { SupplierOrderProvider, SupplierOrderStatus, SupplierCommitMode } from "@prisma/client";
import type { TenantDb } from "@/shared/lib/db";

export type SupplierOrderView = {
  bookingItemId: string;
  itemDescription: string;
  id: string;
  provider: SupplierOrderProvider;
  status: SupplierOrderStatus;
  commitMode: SupplierCommitMode;
  confirmationNumber: string | null;
  attempts: number;
  lastError: string | null;
  retryable: boolean | null;
  requestedAt: Date | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  /** When the Booking Status Resolution Capability last checked the
   * supplier — derived from the newest STATUS_CHECKED event, not a
   * separate column. Null until the first check runs. */
  lastCheckedAt: Date | null;
};

/** All executable/executed lines on a booking, for the execution UI. */
export async function listSupplierOrders(
  db: TenantDb,
  bookingId: string,
): Promise<SupplierOrderView[]> {
  const items = await db.bookingItem.findMany({
    where: { bookingId, type: { in: ["FLIGHT", "HOTEL"] }, referenceId: { not: null } },
    select: {
      id: true,
      type: true,
      description: true,
      supplierOrder: {
        select: {
          id: true,
          provider: true,
          status: true,
          commitMode: true,
          confirmationNumber: true,
          attempts: true,
          lastError: true,
          retryable: true,
          requestedAt: true,
          confirmedAt: true,
          cancelledAt: true,
          events: {
            where: { type: "STATUS_CHECKED" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return items.map((item) => {
    // No SupplierOrder yet (not requested) — default to what this line's
    // type would actually get once it is, so the "not yet executed" row
    // never shows a Duffel/HOLD default for a Hotelbeds line.
    const defaultProvider = item.type === "HOTEL" ? "HOTELBEDS" : "DUFFEL";
    const defaultCommitMode = item.type === "HOTEL" ? "IMMEDIATE" : "HOLD";
    return {
      bookingItemId: item.id,
      itemDescription: item.description,
      id: item.supplierOrder?.id ?? "",
      provider: item.supplierOrder?.provider ?? defaultProvider,
      status: item.supplierOrder?.status ?? "PENDING",
      commitMode: item.supplierOrder?.commitMode ?? defaultCommitMode,
      confirmationNumber: item.supplierOrder?.confirmationNumber ?? null,
      attempts: item.supplierOrder?.attempts ?? 0,
      lastError: item.supplierOrder?.lastError ?? null,
      retryable: item.supplierOrder?.retryable ?? null,
      requestedAt: item.supplierOrder?.requestedAt ?? null,
      confirmedAt: item.supplierOrder?.confirmedAt ?? null,
      cancelledAt: item.supplierOrder?.cancelledAt ?? null,
      lastCheckedAt: item.supplierOrder?.events[0]?.createdAt ?? null,
    };
  });
}
