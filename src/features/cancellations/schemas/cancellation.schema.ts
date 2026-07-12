import { z } from "zod";

export const PENALTY_TYPES = ["NONE", "PERCENTAGE", "FIXED"] as const;
export const PENALTY_TYPE_LABELS: Record<(typeof PENALTY_TYPES)[number], string> = {
  NONE: "Free cancellation",
  PERCENTAGE: "% of booking total",
  FIXED: "Fixed amount",
};

const ruleSchema = z
  .object({
    daysBefore: z.coerce.number().int().min(0).max(3650),
    penaltyType: z.enum(PENALTY_TYPES),
    penaltyValue: z.coerce.number().min(0).max(100_000_000),
  })
  .refine((r) => r.penaltyType !== "PERCENTAGE" || r.penaltyValue <= 100, {
    message: "A percentage penalty can't exceed 100",
    path: ["penaltyValue"],
  });
export type PolicyRuleInput = z.infer<typeof ruleSchema>;

/** Create/update a cancellation policy. Rules are replaced wholesale on
 * update — the tier set is small and versioning individual rows buys
 * nothing (historical cancellations snapshot their applied tier anyway). */
export const cancellationPolicyFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(150),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    isDefault: z.boolean().optional(),
    rules: z.array(ruleSchema).min(1, "Add at least one tier").max(20),
  })
  .refine(
    (p) => new Set(p.rules.map((r) => r.daysBefore)).size === p.rules.length,
    { message: "Each tier needs a distinct days-before threshold", path: ["rules"] },
  );
export type CancellationPolicyFormInput = z.infer<typeof cancellationPolicyFormSchema>;

export const assignPolicySchema = z.object({
  /** Empty string clears the assignment. */
  policyId: z.string().optional().or(z.literal("")),
});
export type AssignPolicyInput = z.infer<typeof assignPolicySchema>;
