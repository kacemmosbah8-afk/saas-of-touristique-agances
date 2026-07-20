import { z } from "zod";

/**
 * The public storefront's contact/inquiry form. Deliberately its own
 * schema rather than a reuse of `leadFormSchema` — that schema requires a
 * `currency` an anonymous visitor has no reason to know, and a `title` a
 * visitor shouldn't have to invent. `createPublicInquiryAction` derives
 * both server-side instead.
 */
export const publicInquirySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  packageSlug: z.string().trim().max(200).optional().or(z.literal("")),
  hotelSlug: z.string().trim().max(200).optional().or(z.literal("")),
  destinationSlug: z.string().trim().max(200).optional().or(z.literal("")),
  activitySlug: z.string().trim().max(200).optional().or(z.literal("")),
  flightSlug: z.string().trim().max(200).optional().or(z.literal("")),
  /** Honeypot — real visitors never see or fill this field. */
  company: z.string().trim().optional().or(z.literal("")),
});
export type PublicInquiryInput = z.infer<typeof publicInquirySchema>;
