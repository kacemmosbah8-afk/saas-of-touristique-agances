import "server-only";

import type { InvoiceStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";
import { computeBalance } from "@/shared/lib/money";

export type BookingInvoiceView = {
  id: string;
  reference: string;
  status: InvoiceStatus;
  currency: string;
  total: number;
  balanceDue: number;
  /** paid − refunded on this invoice; the cancellation engine sums these. */
  netPaid: number;
  dueDate: Date | null;
  createdAt: Date;
};

/** The invoices generated from a booking, for the booking detail page. */
export async function listInvoicesForBooking(
  db: TenantDb,
  bookingId: string,
): Promise<BookingInvoiceView[]> {
  const invoices = await db.invoice.findMany({
    where: { bookingId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      status: true,
      currency: true,
      total: true,
      amountPaid: true,
      amountRefunded: true,
      amountCredited: true,
      dueDate: true,
      createdAt: true,
    },
  });

  return invoices.map((inv) => {
    const balance = computeBalance({
      total: toNumber(inv.total) ?? 0,
      paid: toNumber(inv.amountPaid) ?? 0,
      refunded: toNumber(inv.amountRefunded) ?? 0,
      credited: toNumber(inv.amountCredited) ?? 0,
    });
    return {
      id: inv.id,
      reference: inv.reference,
      status: inv.status,
      currency: inv.currency,
      total: toNumber(inv.total) ?? 0,
      balanceDue: balance.balanceDue,
      netPaid: inv.status === "VOID" ? 0 : balance.netPaid,
      dueDate: inv.dueDate,
      createdAt: inv.createdAt,
    };
  });
}
