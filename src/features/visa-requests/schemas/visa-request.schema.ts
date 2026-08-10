import { z } from "zod";
import type { CountryCode } from "libphonenumber-js";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";
import { dateRangeRefinement, optionalDateString } from "@/shared/schemas/date.schema";
import { normalizePhoneNumber } from "@/shared/schemas/phone.schema";
import { VISA_REQUEST_STATUSES } from "@/features/visa-requests/lib/status";

const optionalText = (max: number) =>
  z.string().trim().max(max, "Too long").optional().or(z.literal(""));

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, "Too long");

/**
 * One traveler's passport details on a visa request. Reuses
 * `travellers/schemas/traveller.schema.ts`'s field shape, but the fields
 * that are optional metadata on a booking traveller are the whole point of
 * a visa request, so they're required here instead.
 */
export const visaRequestTravellerSchema = z.object({
  firstName: requiredText(120, "First name is required"),
  lastName: requiredText(120, "Last name is required"),
  dateOfBirth: optionalDateString(),
  nationality: requiredText(120, "Nationality is required"),
  passportNumber: requiredText(60, "Passport number is required"),
  passportIssuingCountry: requiredText(120, "Passport issuing country is required"),
  passportIssueDate: optionalDateString(),
  passportExpiry: z
    .string()
    .trim()
    .min(1, "Passport expiry date is required")
    .refine((value) => z.iso.date().safeParse(value).success, "Invalid date"),
});
export type VisaRequestTravellerInput = z.infer<typeof visaRequestTravellerSchema>;

/**
 * The public "Visa Assistance" storefront form — reachable by anonymous
 * visitors with no login and no existing booking. Unlike
 * `publicBookingRequestSchema` this never names a product; a visitor may
 * optionally supply an existing booking reference (`bookingReference`),
 * resolved best-effort server-side and never required to match.
 */
export const publicVisaRequestSchema = z
  .object({
    destinationCountry: requiredText(2, "Destination country is required"),
    nationality: requiredText(2, "Nationality is required"),
    visaType: requiredText(80, "Visa type is required"),
    travelStartDate: optionalDateString({ notInPast: true }),
    travelEndDate: optionalDateString(),
    travelerCount: z.coerce.number().int().min(1, "At least one traveler").max(20),
    fullName: requiredText(150, "Full name is required"),
    email: z.union([z.string().trim().email("Enter a valid email"), z.literal("")]).optional(),
    phone: requiredText(40, "Phone number is required"),
    whatsapp: optionalText(40),
    notes: optionalText(2000),
    bookingReference: optionalText(60),
    travellers: z.array(visaRequestTravellerSchema).min(1, "At least one traveler is required"),
    /** Honeypot — real visitors never see or fill this field. */
    company: z.string().trim().optional().or(z.literal("")),
  })
  .refine(...dateRangeRefinement("travelStartDate", "travelEndDate"))
  .refine((data) => data.travellers.length === data.travelerCount, {
    message: "Traveler details must match the number of travelers",
    path: ["travellers"],
  })
  .superRefine((data, ctx) => {
    // The applicant's declared nationality is used only as a hint for
    // numbers typed without a country code — a number with its own "+"
    // prefix is parsed as-is regardless. Rejects outright anything that
    // doesn't parse as a plausible phone number at all; see
    // `phone.schema.ts` for why this is format validation, not proof of
    // ownership.
    if (!normalizePhoneNumber(data.phone, data.nationality as CountryCode)) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid phone number, including the country code if different from your nationality",
        path: ["phone"],
      });
    }
  });
export type PublicVisaRequestInput = z.infer<typeof publicVisaRequestSchema>;

export const listVisaRequestsFiltersSchema = baseListFiltersSchema
  .omit({ status: true })
  .extend({
    status: z.enum([...VISA_REQUEST_STATUSES, "all"]).optional(),
  });
export type ListVisaRequestsFilters = z.infer<typeof listVisaRequestsFiltersSchema>;

export const updateVisaRequestStatusSchema = z.object({
  status: z.enum(VISA_REQUEST_STATUSES),
  reason: optionalText(500),
});
export type UpdateVisaRequestStatusInput = z.infer<typeof updateVisaRequestStatusSchema>;

export const addVisaRequestNoteSchema = z.object({
  note: z.string().trim().min(1, "Note is required").max(2000),
});
export type AddVisaRequestNoteInput = z.infer<typeof addVisaRequestNoteSchema>;
