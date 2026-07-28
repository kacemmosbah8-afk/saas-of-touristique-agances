import { z } from "zod";

import { baseListFiltersSchema } from "@/shared/schemas/list.schema";

export const TRANSPORT_TYPES = [
  "AIRPORT_TRANSFER",
  "BUS",
  "PRIVATE",
  "CAR_RENTAL",
  "BOAT",
  "CUSTOM",
] as const;

const optionalText = (max: number) =>
  z.string().trim().max(max, "Too long").optional().or(z.literal(""));

export const transportFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
  type: z.enum(TRANSPORT_TYPES),
  country: optionalText(100),
  city: optionalText(100),
  contactName: optionalText(120),
  contactEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  contactPhone: optionalText(40),
  website: optionalText(200),
  fleetNotes: optionalText(2000),
  pricingNotes: optionalText(2000),
  internalNotes: optionalText(2000),
});
export type TransportFormInput = z.infer<typeof transportFormSchema>;

export const updateTransportStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});
export type UpdateTransportStatusInput = z.infer<typeof updateTransportStatusSchema>;

export const listTransportFiltersSchema = baseListFiltersSchema.extend({
  type: z.enum(TRANSPORT_TYPES).or(z.literal("all")).optional(),
});
export type ListTransportFilters = z.infer<typeof listTransportFiltersSchema>;

export const TRANSPORT_TYPE_LABELS: Record<(typeof TRANSPORT_TYPES)[number], string> = {
  AIRPORT_TRANSFER: "نقل من/إلى المطار",
  BUS: "شركة حافلات",
  PRIVATE: "نقل خاص",
  CAR_RENTAL: "تأجير سيارات",
  BOAT: "مشغّل قوارب",
  CUSTOM: "مخصص",
};
