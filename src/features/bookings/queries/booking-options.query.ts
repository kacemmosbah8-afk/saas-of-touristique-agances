import "server-only";

import type { TenantDb } from "@/shared/lib/db";

export type CustomerOption = { id: string; name: string };
export type PackageOption = { id: string; name: string };

/** Non-archived customers for the booking customer select. */
export async function getCustomerOptions(db: TenantDb): Promise<CustomerOption[]> {
  const customers = await db.customer.findMany({
    where: { deletedAt: null, status: { not: "ARCHIVED" } },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 500,
  });
  return customers.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`.trim() }));
}

export type BookingOption = { id: string; reference: string; customerName: string };

/** Non-cancelled bookings for the optional booking link on an invoice. */
export async function getBookingOptions(db: TenantDb): Promise<BookingOption[]> {
  const bookings = await db.booking.findMany({
    where: { deletedAt: null, status: { not: "CANCELLED" } },
    select: {
      id: true,
      reference: true,
      customer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    customerName: `${b.customer.firstName} ${b.customer.lastName}`.trim(),
  }));
}

/** Published/draft packages for the optional package link on a booking. */
export async function getPackageOptions(db: TenantDb): Promise<PackageOption[]> {
  const packages = await db.package.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 500,
  });
  return packages.map((p) => ({ id: p.id, name: p.name }));
}
