import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";

export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CARD",
  "CHEQUE",
  "ONLINE",
  "OTHER",
] as const;

export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  CHEQUE: "Cheque",
  ONLINE: "Online",
  OTHER: "Other",
};

export const PAYMENT_KINDS = ["DEPOSIT", "INSTALLMENT", "BALANCE"] as const;

export const PAYMENT_KIND_LABELS: Record<(typeof PAYMENT_KINDS)[number], string> = {
  DEPOSIT: "Deposit",
  INSTALLMENT: "Installment",
  BALANCE: "Balance",
};

export const PAYMENT_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

export const PAYMENT_STATUS_LABELS: Record<(typeof PAYMENT_STATUSES)[number], string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
};

/**
 * Recording a received payment. `pending` marks money announced but not yet
 * arrived (e.g. a bank transfer in flight) — it doesn't count toward the
 * balance until completed.
 */
export const recordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(100_000_000, "Too large"),
  method: z.enum(PAYMENT_METHODS),
  kind: z.enum(PAYMENT_KINDS).optional(),
  pending: z.boolean().optional(),
  receivedAt: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date"),
  installmentId: z.string().cuid().optional().or(z.literal("")),
  externalReference: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const refundPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(100_000_000, "Too large"),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;

export const listPaymentsFiltersSchema = baseListFiltersSchema.extend({
  status: z.enum(PAYMENT_STATUSES).or(z.literal("all")).optional(),
  method: z.enum(PAYMENT_METHODS).or(z.literal("all")).optional(),
});
export type ListPaymentsFilters = z.infer<typeof listPaymentsFiltersSchema>;
