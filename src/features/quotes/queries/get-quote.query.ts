import "server-only";

import type { QuoteStatus, BookingItemType, QuoteActivityType } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";
import { toNumber } from "@/shared/lib/list-query";

export type QuoteItemView = {
  id: string;
  type: BookingItemType;
  description: string;
  referenceId: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  notes: string | null;
  sortOrder: number;
};

export type QuoteActivityView = {
  id: string;
  type: QuoteActivityType;
  title: string;
  description: string | null;
  userId: string | null;
  createdAt: Date;
};

export type QuoteDetail = {
  id: string;
  reference: string;
  status: QuoteStatus;
  customerId: string;
  customerName: string;
  packageId: string | null;
  packageName: string | null;
  ownerId: string | null;
  validUntil: Date | null;
  travelStartDate: Date | null;
  travelEndDate: Date | null;
  adults: number;
  children: number;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  terms: string | null;
  internalNotes: string | null;
  sentAt: Date | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  convertedAt: Date | null;
  convertedBookingId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: QuoteItemView[];
  activities: QuoteActivityView[];
};

export async function getQuote(
  db: TenantDb,
  tenantId: string,
  quoteId: string,
): Promise<QuoteDetail | null> {
  const quote = await db.quote.findFirst({
    // Explicit tenantId: single-record lookups are not auto-scoped (see db.ts).
    where: { id: quoteId, tenantId, deletedAt: null },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      package: { select: { name: true } },
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });
  if (!quote) return null;

  return {
    id: quote.id,
    reference: quote.reference,
    status: quote.status,
    customerId: quote.customerId,
    customerName: `${quote.customer.firstName} ${quote.customer.lastName}`.trim(),
    packageId: quote.packageId,
    packageName: quote.package?.name ?? null,
    ownerId: quote.ownerId,
    validUntil: quote.validUntil,
    travelStartDate: quote.travelStartDate,
    travelEndDate: quote.travelEndDate,
    adults: quote.adults,
    children: quote.children,
    currency: quote.currency,
    subtotal: toNumber(quote.subtotal) ?? 0,
    discount: toNumber(quote.discount) ?? 0,
    tax: toNumber(quote.tax) ?? 0,
    total: toNumber(quote.total) ?? 0,
    notes: quote.notes,
    terms: quote.terms,
    internalNotes: quote.internalNotes,
    sentAt: quote.sentAt,
    acceptedAt: quote.acceptedAt,
    declinedAt: quote.declinedAt,
    convertedAt: quote.convertedAt,
    convertedBookingId: quote.convertedBookingId,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
    items: quote.items.map((i) => ({
      id: i.id,
      type: i.type,
      description: i.description,
      referenceId: i.referenceId,
      quantity: i.quantity,
      unitPrice: toNumber(i.unitPrice) ?? 0,
      amount: toNumber(i.amount) ?? 0,
      notes: i.notes,
      sortOrder: i.sortOrder,
    })),
    activities: quote.activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      userId: a.userId,
      createdAt: a.createdAt,
    })),
  };
}
