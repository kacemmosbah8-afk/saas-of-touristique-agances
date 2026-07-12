import { z } from "zod";

export const CONFIRMATION_STATUSES = ["PENDING", "CONFIRMED", "REJECTED"] as const;
export const CONFIRMATION_STATUS_LABELS: Record<
  (typeof CONFIRMATION_STATUSES)[number],
  string
> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
};

export const requestConfirmationSchema = z.object({
  supplierName: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type RequestConfirmationInput = z.infer<typeof requestConfirmationSchema>;

export const confirmConfirmationSchema = z.object({
  confirmationNumber: z.string().trim().min(1, "Confirmation number is required").max(120),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ConfirmConfirmationInput = z.infer<typeof confirmConfirmationSchema>;

export const rejectConfirmationSchema = z.object({
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type RejectConfirmationInput = z.infer<typeof rejectConfirmationSchema>;
