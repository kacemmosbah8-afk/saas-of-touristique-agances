import "server-only";

import type { TenantDb } from "@/shared/lib/db";
import { listDocumentsForOwner } from "@/features/documents/queries/owner-documents.query";
import type { DocumentSummary } from "@/features/documents/queries/list-documents.query";
import { getVoucher, type VoucherDetail } from "@/features/vouchers/queries/voucher.query";
import { writePortalAudit } from "@/shared/lib/audit";

export type PortalVoucherSummary = {
  id: string;
  reference: string;
  serviceDescription: string;
  status: string;
  issuedAt: Date;
};

export type PortalBookingDocuments = {
  vouchers: PortalVoucherSummary[];
  /** Files staff attached directly to this booking (passport scans, signed
   * contracts, …) via the generic Document capability — never files
   * attached elsewhere in the agency (`ownerType` values other than
   * "booking" are out of scope here on purpose). */
  files: DocumentSummary[];
};

/**
 * Everything downloadable for one booking. Re-verifies booking ownership
 * itself (`tenantId` + `customerId`) rather than trusting the caller to
 * have already done so — every other portal query in this file follows the
 * same "never trust the caller, check ownership in the query itself" rule,
 * and this one originally didn't; fixed in the Phase 7 security review
 * before it shipped, not after. Returns `null` for a booking that isn't
 * this customer's, exactly like `getPortalBookingDetail`.
 */
export async function listPortalBookingDocuments(
  db: TenantDb,
  tenantId: string,
  customerId: string,
  bookingId: string,
): Promise<PortalBookingDocuments | null> {
  const owned = await db.booking.findFirst({
    where: { id: bookingId, tenantId, customerId, deletedAt: null },
    select: { id: true },
  });
  if (!owned) return null;

  const [vouchers, files] = await Promise.all([
    db.voucher.findMany({
      where: { bookingId, status: "ISSUED" },
      select: { id: true, reference: true, serviceDescription: true, status: true, issuedAt: true },
      orderBy: { issuedAt: "desc" },
    }),
    listDocumentsForOwner(db, "booking", bookingId),
  ]);

  return {
    vouchers: vouchers.map((v) => ({
      id: v.id,
      reference: v.reference,
      serviceDescription: v.serviceDescription,
      status: v.status,
      issuedAt: v.issuedAt,
    })),
    files,
  };
}

/**
 * Verifies this voucher belongs to a booking owned by `customerId` before
 * reusing the existing (already customer-safe) `getVoucher` query, so the
 * real detail-shaping logic (booking/agency/traveller mapping) is never
 * duplicated, only gated.
 */
export async function getPortalVoucher(
  db: TenantDb,
  tenantId: string,
  customerId: string,
  voucherId: string,
): Promise<VoucherDetail | null> {
  const owned = await db.voucher.findFirst({
    where: { id: voucherId, tenantId, booking: { customerId } },
    select: { id: true },
  });
  if (!owned) return null;

  const voucher = await getVoucher(db, tenantId, voucherId);
  if (voucher) {
    await writePortalAudit(db, { customerId, action: "portal_voucher_viewed", entityId: voucherId }).catch(
      () => undefined,
    );
  }
  return voucher;
}
