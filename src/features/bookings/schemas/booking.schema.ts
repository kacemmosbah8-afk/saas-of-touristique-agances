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
  referenceId: z.string().trim().max(200).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1, "At least 1").max(100_000),
  unitPrice: money,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type BookingItemInput = z.infer<typeof bookingItemSchema>;

export const updateBookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
});
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
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
