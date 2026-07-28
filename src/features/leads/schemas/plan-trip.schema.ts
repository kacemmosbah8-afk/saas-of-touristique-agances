import { z } from "zod";

export const TRAVEL_STYLES = ["LUXURY", "FAMILY", "ADVENTURE", "HONEYMOON", "BUDGET", "CULTURAL"] as const;
export type TravelStyle = (typeof TRAVEL_STYLES)[number];

/**
 * The "Plan My Trip" quiz — deliberately distinct from
 * `publicInquirySchema` (a free-text message) and from a package booking
 * request (`publicBookingRequestSchema`, which always names a specific
 * product). This is for a visitor who hasn't picked a package yet: five
 * short, structured questions instead of an open text box, so the lead
 * that reaches the agency is immediately qualified — a real destination,
 * budget, timing, party size, and style to work from — not just "someone
 * wants to talk."
 */
export const planTripSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  destination: z.string().trim().min(1, "Destination is required").max(200),
  budget: z.coerce.number().positive().max(10_000_000),
  currency: z.string().trim().min(1).max(10),
  travelPeriod: z.string().trim().min(1, "Travel period is required").max(100),
  travelers: z.coerce.number().int().min(1).max(50),
  travelStyle: z.enum(TRAVEL_STYLES),
  /** Honeypot — real visitors never see or fill this field. */
  company: z.string().trim().optional().or(z.literal("")),
});
export type PlanTripInput = z.infer<typeof planTripSchema>;
