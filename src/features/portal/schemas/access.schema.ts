import { z } from "zod";

export const requestPortalAccessSchema = z.object({
  bookingReference: z.string().trim().min(1).max(50),
  email: z.email(),
});
export type RequestPortalAccessInput = z.infer<typeof requestPortalAccessSchema>;
