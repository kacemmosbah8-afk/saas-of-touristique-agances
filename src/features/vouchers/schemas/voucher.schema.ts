import { z } from "zod";

export const VOUCHER_STATUSES = ["ISSUED", "CANCELLED"] as const;
export const VOUCHER_STATUS_LABELS: Record<(typeof VOUCHER_STATUSES)[number], string> = {
  ISSUED: "Issued",
  CANCELLED: "Cancelled",
};

/** Everything printed on a voucher is snapshotted server-side from the
 * booking (travellers, supplier, dates, confirmation number) — the caller
 * only picks the service line and may add operational notes. */
export const generateVoucherSchema = z.object({
  bookingItemId: z.string().cuid("Pick a service line"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type GenerateVoucherInput = z.infer<typeof generateVoucherSchema>;
