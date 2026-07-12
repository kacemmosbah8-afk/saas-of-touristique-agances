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
    where: { bookingId, type: "FLIGHT", referenceId: { not: null } },
    select: {
      id: true,
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

  return items.map((item) => ({
      bookingItemId: item.id,
      itemDescription: item.description,
      id: item.supplierOrder?.id ?? "",
      provider: item.supplierOrder?.provider ?? "DUFFEL",
      status: item.supplierOrder?.status ?? "PENDING",
      paymentMode: item.supplierOrder?.paymentMode ?? "HOLD",
      confirmationNumber: item.supplierOrder?.confirmationNumber ?? null,
      attempts: item.supplierOrder?.attempts ?? 0,
      lastError: item.supplierOrder?.lastError ?? null,
      retryable: item.supplierOrder?.retryable ?? null,
      paidOverride: item.supplierOrder?.paidOverride ?? false,
    }));
}
