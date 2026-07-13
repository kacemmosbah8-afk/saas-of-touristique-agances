import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";
import { BOOKING_STATUSES } from "@/features/bookings/lib/status";

export const BOOKING_ITEM_TYPES = [
  "HOTEL",
  "TRANSPORT",
  "ACTIVITY",
  "GUIDE",
  "FLIGHT",
  "PACKAGE",
  "OTHER",
] as const;

export const BOOKING_ITEM_TYPE_LABELS: Record<(typeof BOOKING_ITEM_TYPES)[number], string> = {
  HOTEL: "Hotel",
  TRANSPORT: "Transport",
  ACTIVITY: "Activity",
  GUIDE: "Guide",
  FLIGHT: "Flight",
  PACKAGE: "Package",
  OTHER: "Other",
};

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date");

const money = z.number().min(0, "Must be positive").max(100_000_000, "Too large");

/** Create/update form for the booking header (not its line items). */
export const bookingFormSchema = z
  .object({
    customerId: z.string().cuid("Select a customer"),
    packageId: z.string().cuid().optional().or(z.literal("")),
    ownerId: z.string().optional().or(z.literal("")),
    travelStartDate: optionalDate,
    travelEndDate: optionalDate,
    adults: z.number().int().min(1, "At least one traveller").max(1000),
    children: z.number().int().min(0).max(1000),
    currency: z.string().trim().length(3, "Use a 3-letter code").toUpperCase(),
    discount: money.optional(),
    tax: money.optional(),
    notes: z.string().trim().max(5000).optional().or(z.literal("")),
    internalNotes: z.string().trim().max(5000).optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      !d.travelStartDate ||
      !d.travelEndDate ||
      Date.parse(d.travelEndDate) >= Date.parse(d.travelStartDate),
    { message: "End date must be on or after the start date", path: ["travelEndDate"] },
  );
export type BookingFormInput = z.infer<typeof bookingFormSchema>;

export const bookingItemSchema = z.object({
  type: z.enum(BOOKING_ITEM_TYPES),
  description: z.string().trim().min(1, "Description is required").max(300),
  // Long enough for external supplier keys (Hotelbeds rate keys run 150–400 chars).
  referenceId: z.string().trim().max(600).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1, "At least 1").max(100_000),
  unitPrice: money,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  // Supplier-reported rate comments (e.g. Hotelbeds), captured verbatim at
  // booking-prep time. Not agent-authored — see BookingItem.supplierRateComments.
  supplierRateComments: z.string().trim().max(2000).optional().or(z.literal("")),
  // The raw supplier cost this line's unitPrice was priced from (Universal
  // Pricing Engine input), captured at booking-prep time — see
  // BookingItem.supplierCost. Not agent-authored.
  supplierCost: money.optional(),
});
export type BookingItemInput = z.infer<typeof bookingItemSchema>;

export const updateBookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
});
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
  // M4 Sprint 4 — cancellation engine inputs. The penalty the supplier
  // charges the agency (passed through to the outcome calculation); notes
  // stored on the cancellation record.
  supplierPenalty: z.number().min(0).max(100_000_000).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const assignBookingSchema = z.object({
  ownerId: z.string().optional().or(z.literal("")),
});
export type AssignBookingInput = z.infer<typeof assignBookingSchema>;

export const listBookingsFiltersSchema = baseListFiltersSchema.extend({
  status: z.enum(BOOKING_STATUSES).or(z.literal("all")).optional(),
  owner: z.string().optional(),
});
export type ListBookingsFilters = z.infer<typeof listBookingsFiltersSchema>;
