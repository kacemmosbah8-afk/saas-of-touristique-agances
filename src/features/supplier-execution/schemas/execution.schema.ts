import { z } from "zod";

/**
 * `overridePayment: true` proceeds even though the booking's invoices
 * aren't fully settled — requires `booking:manage` (checked in the action,
 * not here) and is always audited. See PROJECT.md, "soft precondition".
 */
export const requestExecutionSchema = z.object({
  overridePayment: z.boolean().optional(),
});
export type RequestExecutionInput = z.infer<typeof requestExecutionSchema>;
