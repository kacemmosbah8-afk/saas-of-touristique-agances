import "server-only";

import type { SupplierOrderProvider, SupplierOrderStatus, SupplierPaymentMode } from "@prisma/client";
import type { TenantDb } from "@/shared/lib/db";

export type SupplierOrderView = {
  bookingItemId: string;
  itemDescription: string;
  id: string;
  provider: SupplierOrderProvider;
  status: SupplierOrderStatus;
  paymentMode: SupplierPaymentMode;
  confirmationNumber: string | null;
  attempts: number;
  lastError: string | null;
  retryable: boolean | null;
  paidOverride: boolean;
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
          paymentMode: true,
          confirmationNumber: true,
          attempts: true,
          lastError: true,
          retryable: true,
          paidOverride: true,
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
    const defaultPaymentMode = item.type === "HOTEL" ? "BALANCE" : "HOLD";
    return {
      bookingItemId: item.id,
      itemDescription: item.description,
      id: item.supplierOrder?.id ?? "",
      provider: item.supplierOrder?.provider ?? defaultProvider,
      status: item.supplierOrder?.status ?? "PENDING",
      paymentMode: item.supplierOrder?.paymentMode ?? defaultPaymentMode,
      confirmationNumber: item.supplierOrder?.confirmationNumber ?? null,
      attempts: item.supplierOrder?.attempts ?? 0,
      lastError: item.supplierOrder?.lastError ?? null,
      retryable: item.supplierOrder?.retryable ?? null,
      paidOverride: item.supplierOrder?.paidOverride ?? false,
    };
  });
}
