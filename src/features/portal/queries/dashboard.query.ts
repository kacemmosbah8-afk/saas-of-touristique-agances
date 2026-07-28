import "server-only";

import type { BookingStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type PortalBookingSummary = {
  id: string;
  reference: string;
  status: BookingStatus;
  /** Package name if this booking was built from one, else the first line's
   * description, else just the reference — always something presentable. */
  tripSummary: string;
  travelStartDate: Date | null;
  travelEndDate: Date | null;
  adults: number;
  children: number;
  currency: string;
  total: number;
};

/**
 * Every booking belonging to this customer, scoped by BOTH `tenantId` (via
 * the tenant-scoped `db`) AND `customerId` explicitly in the `where` — the
 * second is the traveler-isolation boundary a portal session adds on top of
 * ordinary tenant isolation. A tenant has many customers; this must never
 * return another customer's booking even though they share a tenant.
 */
export async function listPortalBookings(
  db: TenantDb,
  tenantId: string,
  customerId: string,
): Promise<PortalBookingSummary[]> {
  const bookings = await db.booking.findMany({
    where: { tenantId, customerId, deletedAt: null },
    select: {
      id: true,
      reference: true,
      status: true,
      package: { select: { name: true } },
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: { description: true },
      },
      travelStartDate: true,
      travelEndDate: true,
      adults: true,
      children: true,
      currency: true,
      total: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    status: b.status,
    tripSummary: b.package?.name ?? b.items[0]?.description ?? b.reference,
    travelStartDate: b.travelStartDate,
    travelEndDate: b.travelEndDate,
    adults: b.adults,
    children: b.children,
    currency: b.currency,
    total: toNumber(b.total) ?? 0,
  }));
}
