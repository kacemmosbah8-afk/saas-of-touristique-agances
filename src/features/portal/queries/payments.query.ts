import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";
import { computeBalance } from "@/shared/lib/money";

/**
 * Read-only ledger view across every one of this customer's invoices —
 * built directly on the M4 Sprint 3 Invoicing & Payments domain
 * (Invoice/Payment), the agency's ledger toward its OWN travel customers.
 * This is categorically separate from the Commercial SaaS Capability's
 * `Subscription`/`BillingAccount`/`PaymentProvider` (TravelOS's ledger
 * toward the AGENCY) — none of that is reachable from here, and must never
 * be: a traveler has no business relationship with TravelOS itself. The
 * "future Paddle integration point" this sprint's brief mentions is online
 * payment collection FROM the traveler through this same portal — not yet
 * built (read-only this sprint), tracked as a named gap in PROJECT.md.
 */
export type PortalPaymentEntry = {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  receivedAt: Date;
  invoiceReference: string;
  bookingReference: string | null;
};

export type PortalPaymentsOverview = {
  currency: string;
  totalPaid: number;
  totalOutstanding: number;
  payments: PortalPaymentEntry[];
};

export async function getPortalPaymentsOverview(
  db: TenantDb,
  tenantId: string,
  customerId: string,
): Promise<PortalPaymentsOverview> {
  const invoices = await db.invoice.findMany({
    where: { tenantId, customerId, deletedAt: null, status: { not: "VOID" } },
    select: {
      reference: true,
      currency: true,
      total: true,
      amountPaid: true,
      amountRefunded: true,
      amountCredited: true,
      booking: { select: { reference: true } },
      payments: {
        where: { status: "COMPLETED" },
        select: { id: true, reference: true, amount: true, currency: true, receivedAt: true },
        orderBy: { receivedAt: "desc" },
      },
    },
  });

  let totalPaid = 0;
  let totalOutstanding = 0;
  const currency = invoices[0]?.currency ?? "USD";
  const payments: PortalPaymentEntry[] = [];

  for (const inv of invoices) {
    const balance = computeBalance({
      total: toNumber(inv.total) ?? 0,
      paid: toNumber(inv.amountPaid) ?? 0,
      refunded: toNumber(inv.amountRefunded) ?? 0,
      credited: toNumber(inv.amountCredited) ?? 0,
    });
    totalPaid += balance.netPaid;
    totalOutstanding += balance.balanceDue;

    for (const p of inv.payments) {
      payments.push({
        id: p.id,
        reference: p.reference,
        amount: toNumber(p.amount) ?? 0,
        currency: p.currency,
        receivedAt: p.receivedAt,
        invoiceReference: inv.reference,
        bookingReference: inv.booking?.reference ?? null,
      });
    }
  }

  payments.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

  return { currency, totalPaid, totalOutstanding, payments };
}
