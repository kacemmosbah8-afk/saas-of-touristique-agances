import "server-only";

import type { BookingItemType, VoucherStatus } from "@prisma/client";

import type { TenantDb } from "@/shared/lib/db";

export type VoucherSummary = {
  id: string;
  reference: string;
  type: BookingItemType;
  status: VoucherStatus;
  serviceDescription: string;
  supplierName: string | null;
  issuedAt: Date;
};

/** Vouchers issued for a booking, newest first. */
export async function listBookingVouchers(
  db: TenantDb,
  bookingId: string,
): Promise<VoucherSummary[]> {
  const vouchers = await db.voucher.findMany({
    where: { bookingId },
    orderBy: { issuedAt: "desc" },
    select: {
      id: true,
      reference: true,
      type: true,
      status: true,
      serviceDescription: true,
      supplierName: true,
      issuedAt: true,
    },
  });
  return vouchers;
}

export type VoucherDetail = {
  id: string;
  reference: string;
  type: BookingItemType;
  status: VoucherStatus;
  bookingId: string;
  bookingReference: string;
  customerName: string;
  agencyName: string;
  supplierName: string | null;
  serviceDescription: string;
  serviceStartDate: Date | null;
  serviceEndDate: Date | null;
  travellerNames: string[];
  confirmationNumber: string | null;
  qrData: string;
  notes: string | null;
  issuedAt: Date;
  cancelledAt: Date | null;
};

/** Full voucher for the printable view. */
export async function getVoucher(
  db: TenantDb,
  tenantId: string,
  voucherId: string,
): Promise<VoucherDetail | null> {
  const voucher = await db.voucher.findFirst({
    // Explicit tenantId: single-record lookups are not auto-scoped (see db.ts).
    where: { id: voucherId, tenantId },
    include: {
      tenant: { select: { name: true } },
      booking: {
        select: {
          reference: true,
          customer: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!voucher) return null;

  return {
    id: voucher.id,
    reference: voucher.reference,
    type: voucher.type,
    status: voucher.status,
    bookingId: voucher.bookingId,
    bookingReference: voucher.booking.reference,
    customerName:
      `${voucher.booking.customer.firstName} ${voucher.booking.customer.lastName}`.trim(),
    agencyName: voucher.tenant.name,
    supplierName: voucher.supplierName,
    serviceDescription: voucher.serviceDescription,
    serviceStartDate: voucher.serviceStartDate,
    serviceEndDate: voucher.serviceEndDate,
    travellerNames: voucher.travellerNames,
    confirmationNumber: voucher.confirmationNumber,
    qrData: voucher.qrData,
    notes: voucher.notes,
    issuedAt: voucher.issuedAt,
    cancelledAt: voucher.cancelledAt,
  };
}
