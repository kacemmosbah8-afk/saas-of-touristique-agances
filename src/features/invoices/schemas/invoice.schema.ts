import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";
import { INVOICE_STATUSES } from "@/features/invoices/lib/invoice-status";
import { BOOKING_ITEM_TYPES } from "@/features/bookings/schemas/booking.schema";

// Invoice line items share the booking line taxonomy (an invoice is generated
// from a booking by direct line copy), so the item type list is reused.
export {
  BOOKING_ITEM_TYPES as INVOICE_ITEM_TYPES,
  BOOKING_ITEM_TYPE_LABELS as INVOICE_ITEM_TYPE_LABELS,
} from "@/features/bookings/schemas/booking.schema";

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date");

const money = z.number().min(0, "Must be positive").max(100_000_000, "Too large");

/** Create/update form for the invoice header (not its line items). */
export const invoiceFormSchema = z.object({
  customerId: z.string().cuid("Select a customer"),
  bookingId: z.string().cuid().optional().or(z.literal("")),
  dueDate: optionalDate,
  currency: z.string().trim().length(3, "Use a 3-letter code").toUpperCase(),
  discount: money.optional(),
  tax: money.optional(),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  terms: z.string().trim().max(5000).optional().or(z.literal("")),
  internalNotes: z.string().trim().max(5000).optional().or(z.literal("")),
});
export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>;

export const invoiceItemSchema = z.object({
  type: z.enum(BOOKING_ITEM_TYPES),
  description: z.string().trim().min(1, "Description is required").max(300),
  referenceId: z.string().trim().max(200).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1, "At least 1").max(100_000),
  unitPrice: money,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

/** Issuing requires a payment deadline; the due date defaults in the UI. */
export const issueInvoiceSchema = z.object({
  dueDate: z
    .string()
    .trim()
    .min(1, "Due date is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});
export type IssueInvoiceInput = z.infer<typeof issueInvoiceSchema>;

export const voidInvoiceSchema = z.object({
  reason: z.string().trim().min(1, "A void reason is required").max(500),
});
export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>;

export const creditNoteSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(100_000_000, "Too large"),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type CreditNoteInput = z.infer<typeof creditNoteSchema>;

export const installmentPlanSchema = z.object({
  depositAmount: money.optional(),
  installmentCount: z.coerce.number().int().min(1, "At least one installment").max(36),
  firstDueDate: z
    .string()
    .trim()
    .min(1, "First due date is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  intervalDays: z.coerce.number().int().min(1, "At least 1 day").max(365),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type InstallmentPlanInput = z.infer<typeof installmentPlanSchema>;

export const listInvoicesFiltersSchema = baseListFiltersSchema.extend({
  status: z.enum(INVOICE_STATUSES).or(z.literal("all")).optional(),
  /** "overdue" narrows to open invoices past their due date. */
  due: z.literal("overdue").or(z.literal("all")).optional(),
});
export type ListInvoicesFilters = z.infer<typeof listInvoicesFiltersSchema>;
