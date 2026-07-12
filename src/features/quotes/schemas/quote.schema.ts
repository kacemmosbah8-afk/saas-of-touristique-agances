import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";
import { QUOTE_STATUSES } from "@/features/quotes/lib/quote-status";
import { BOOKING_ITEM_TYPES } from "@/features/bookings/schemas/booking.schema";

// Quote line items share the booking line taxonomy (a quote line converts
// directly into a booking line), so the item type list is reused rather than
// redefined.
export { BOOKING_ITEM_TYPES as QUOTE_ITEM_TYPES, BOOKING_ITEM_TYPE_LABELS as QUOTE_ITEM_TYPE_LABELS } from "@/features/bookings/schemas/booking.schema";

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date");

const money = z.number().min(0, "Must be positive").max(100_000_000, "Too large");

/** Create/update form for the quote header (not its line items). */
export const quoteFormSchema = z
  .object({
    customerId: z.string().cuid("Select a customer"),
    packageId: z.string().cuid().optional().or(z.literal("")),
    ownerId: z.string().optional().or(z.literal("")),
    validUntil: optionalDate,
    travelStartDate: optionalDate,
    travelEndDate: optionalDate,
    adults: z.number().int().min(1, "At least one traveller").max(1000),
    children: z.number().int().min(0).max(1000),
    currency: z.string().trim().length(3, "Use a 3-letter code").toUpperCase(),
    discount: money.optional(),
    tax: money.optional(),
    notes: z.string().trim().max(5000).optional().or(z.literal("")),
    terms: z.string().trim().max(5000).optional().or(z.literal("")),
    internalNotes: z.string().trim().max(5000).optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      !d.travelStartDate ||
      !d.travelEndDate ||
      Date.parse(d.travelEndDate) >= Date.parse(d.travelStartDate),
    { message: "End date must be on or after the start date", path: ["travelEndDate"] },
  );
export type QuoteFormInput = z.infer<typeof quoteFormSchema>;

export const quoteItemSchema = z.object({
  type: z.enum(BOOKING_ITEM_TYPES),
  description: z.string().trim().min(1, "Description is required").max(300),
  referenceId: z.string().trim().max(200).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1, "At least 1").max(100_000),
  unitPrice: money,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;

export const updateQuoteStatusSchema = z.object({
  status: z.enum(QUOTE_STATUSES),
});
export type UpdateQuoteStatusInput = z.infer<typeof updateQuoteStatusSchema>;

export const declineQuoteSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
export type DeclineQuoteInput = z.infer<typeof declineQuoteSchema>;

export const assignQuoteSchema = z.object({
  ownerId: z.string().optional().or(z.literal("")),
});
export type AssignQuoteInput = z.infer<typeof assignQuoteSchema>;

export const listQuotesFiltersSchema = baseListFiltersSchema.extend({
  status: z.enum(QUOTE_STATUSES).or(z.literal("all")).optional(),
  owner: z.string().optional(),
});
export type ListQuotesFilters = z.infer<typeof listQuotesFiltersSchema>;
