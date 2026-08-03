import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";
import { dateRangeRefinement, optionalDateString } from "@/shared/schemas/date.schema";

const optionalText = (max: number) =>
  z.string().trim().max(max, "Too long").optional().or(z.literal(""));

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, "Too long");

export const BOOKING_REQUEST_PRODUCT_TYPES = [
  "PACKAGE",
  "HOTEL",
  "DESTINATION",
  "ACTIVITY",
  "FLIGHT",
] as const;

/**
 * The public storefront's "Request to Book" form. Unlike `publicInquirySchema`
 * this always names a specific product — required, not optional — because a
 * booking request must "always remain linked to the selected travel product"
 * (product spec). Reachable by anonymous visitors; see
 * `createBookingRequestAction`.
 */
export const publicBookingRequestSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required").max(150),
    email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]).optional(),
    phone: requiredText(40, "Phone number is required"),
    whatsapp: requiredText(40, "WhatsApp number is required"),
    adults: z.coerce.number().int().min(1, "At least one adult").max(50),
    children: z.coerce.number().int().min(0).max(50),
    preferredDate: optionalDateString({ notInPast: true }),
    returnDate: optionalDateString(),
    productType: z.enum(BOOKING_REQUEST_PRODUCT_TYPES),
    productSlug: z.string().trim().min(1, "Missing product reference").max(200),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    /** Honeypot — real visitors never see or fill this field. */
    company: z.string().trim().optional().or(z.literal("")),
  })
  .refine(...dateRangeRefinement("preferredDate", "returnDate"));
export type PublicBookingRequestInput = z.infer<typeof publicBookingRequestSchema>;

export const listBookingRequestsFiltersSchema = baseListFiltersSchema
  .omit({ status: true })
  .extend({
    status: z.enum(["PENDING", "CONTACTED", "CONFIRMED", "REJECTED", "CANCELLED", "all"]).optional(),
    productType: z.enum([...BOOKING_REQUEST_PRODUCT_TYPES, "all"]).optional(),
  });
export type ListBookingRequestsFilters = z.infer<typeof listBookingRequestsFiltersSchema>;

export const updateBookingRequestStatusSchema = z.object({
  status: z.enum(["PENDING", "CONTACTED", "REJECTED", "CANCELLED"]),
  reason: optionalText(500),
});
export type UpdateBookingRequestStatusInput = z.infer<typeof updateBookingRequestStatusSchema>;

export const addBookingRequestNoteSchema = z.object({
  note: z.string().trim().min(1, "Note is required").max(2000),
});
export type AddBookingRequestNoteInput = z.infer<typeof addBookingRequestNoteSchema>;

export const convertBookingRequestSchema = z.object({
  existingCustomerId: z.string().trim().optional().or(z.literal("")),
});
export type ConvertBookingRequestInput = z.infer<typeof convertBookingRequestSchema>;
