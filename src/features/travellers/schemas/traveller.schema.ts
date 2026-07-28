import { z } from "zod";

export const TRAVELLER_TYPES = ["ADULT", "CHILD", "INFANT"] as const;
export const TRAVELLER_TYPE_LABELS: Record<(typeof TRAVELLER_TYPES)[number], string> = {
  ADULT: "Adult",
  CHILD: "Child",
  INFANT: "Infant",
};

export const GENDERS = ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"] as const;
export const GENDER_LABELS: Record<(typeof GENDERS)[number], string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  UNSPECIFIED: "Unspecified",
};

export const VISA_STATUSES = [
  "UNKNOWN",
  "NOT_REQUIRED",
  "REQUIRED",
  "IN_PROGRESS",
  "OBTAINED",
  "DENIED",
] as const;
export const VISA_STATUS_LABELS: Record<(typeof VISA_STATUSES)[number], string> = {
  UNKNOWN: "Not checked",
  NOT_REQUIRED: "Not required",
  REQUIRED: "Required",
  IN_PROGRESS: "In progress",
  OBTAINED: "Obtained",
  DENIED: "Denied",
};

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date");

const optionalShort = z.string().trim().max(120).optional().or(z.literal(""));

export const travellerFormSchema = z.object({
  type: z.enum(TRAVELLER_TYPES),
  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: z.string().trim().min(1, "Last name is required").max(120),
  gender: z.enum(GENDERS),
  dateOfBirth: optionalDate,
  nationality: optionalShort,
  passportNumber: optionalShort,
  passportIssuingCountry: optionalShort,
  passportIssueDate: optionalDate,
  passportExpiry: optionalDate,
  visaStatus: z.enum(VISA_STATUSES),
  visaNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  emergencyContactName: optionalShort,
  emergencyContactPhone: optionalShort,
  emergencyContactRelation: optionalShort,
  specialRequests: z.string().trim().max(2000).optional().or(z.literal("")),
  medicalNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  frequentFlyerAirline: optionalShort,
  frequentFlyerNumber: optionalShort,
});
export type TravellerFormInput = z.infer<typeof travellerFormSchema>;
