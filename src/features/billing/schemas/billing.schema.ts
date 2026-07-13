import { z } from "zod";

export const activatePlanSchema = z.object({
  planCode: z.string().min(1),
});
export type ActivatePlanInput = z.infer<typeof activatePlanSchema>;

/**
 * `acknowledgeSeatOverage: true` proceeds with a downgrade even though the
 * new plan's seat limit is below current usage — always audited. See
 * PROJECT.md, "explicit, audited override" (mirrors `overridePayment` in
 * the Supplier Order Execution schema).
 */
export const changePlanSchema = z.object({
  newPlanCode: z.string().min(1),
  acknowledgeSeatOverage: z.boolean().optional(),
});
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
