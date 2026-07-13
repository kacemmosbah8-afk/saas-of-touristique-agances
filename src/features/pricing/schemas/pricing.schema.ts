import { z } from "zod";

/**
 * The Universal Pricing Engine's rule vocabulary. A tenant's whole pricing
 * policy is an ordered array of these — stored as `TenantSettings.pricingSettings`
 * (a `Json` column, exactly like `crmSettings`/`leadSettings`/etc.), so a new
 * component type is a new literal here, never a migration. Every amount/percent
 * is required non-negative — sign (add vs. subtract) is implied by `type`, not
 * by allowing a negative input; this is what makes "negative values rejection"
 * a schema-level guarantee rather than a convention callers must remember.
 */
const nonNegativeAmount = z.number().min(0, "Must be zero or positive").max(1_000_000_000);
const nonNegativePercent = z.number().min(0, "Must be zero or positive").max(1_000_000);

export const pricingComponentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MARKUP_FIXED"), amount: nonNegativeAmount }),
  z.object({ type: z.literal("MARKUP_PERCENT"), percent: nonNegativePercent }),
  /** Same additive mechanics as MARKUP_PERCENT — a distinct tag so a
   * breakdown/report can separate "commission earned" from "markup added"
   * even though both increase price over cost. */
  z.object({ type: z.literal("COMMISSION_PERCENT"), percent: nonNegativePercent }),
  z.object({ type: z.literal("FEE_FIXED"), amount: nonNegativeAmount }),
  z.object({ type: z.literal("FEE_PERCENT"), percent: nonNegativePercent }),
  /** Placeholder, not a real tax-jurisdiction engine — see PROJECT.md. */
  z.object({ type: z.literal("TAX_PERCENT"), percent: nonNegativePercent }),
  z.object({ type: z.literal("DISCOUNT_FIXED"), amount: nonNegativeAmount }),
  z.object({ type: z.literal("DISCOUNT_PERCENT"), percent: nonNegativePercent }),
  z.object({
    type: z.literal("COUPON_FIXED"),
    amount: nonNegativeAmount,
    code: z.string().trim().max(40).optional(),
  }),
  z.object({ type: z.literal("PROMO_PERCENT"), percent: nonNegativePercent }),
  /** Clamp, not a sequential step — applied once at the end regardless of
   * where it appears in the array. See calculate.ts. */
  z.object({ type: z.literal("MIN_MARKUP_PERCENT"), percent: nonNegativePercent }),
  z.object({ type: z.literal("MAX_MARKUP_PERCENT"), percent: nonNegativePercent }),
  /** Final rounding rule — e.g. `unit: 1` rounds to the nearest whole
   * currency unit, `unit: 5` to the nearest 5. Also a clamp-like final
   * step, not a sequential one. */
  z.object({ type: z.literal("ROUND_TO_NEAREST"), unit: z.number().positive().max(1_000_000) }),
]);
export type PricingComponent = z.infer<typeof pricingComponentSchema>;
export type PricingComponentType = PricingComponent["type"];

export const pricingPolicySchema = z.object({
  components: z.array(pricingComponentSchema).max(20).default([]),
});
export type PricingPolicy = z.infer<typeof pricingPolicySchema>;

/**
 * The tenant's whole pricing policy. `default` is the TENANT-scope rule;
 * `overrides` keys are free-text supplier tags ("HOTELBEDS", "DUFFEL",
 * "AMADEUS", any future supplier name) — SUPPLIER-scope rules, resolved
 * before falling back to `default`. Neither `default` nor any override is
 * required to have any components: an empty array is a valid, deliberate
 * "no markup configured" policy, not a missing one — see `resolve.ts`.
 * GLOBAL scope is simply what this schema's own defaults produce when a
 * tenant has never configured pricing at all (`{ default: { components: [] },
 * overrides: {} }`) — a fresh workspace starts at zero markup, honest and
 * non-guessing, rather than an invented starter percentage.
 */
export const pricingSettingsSchema = z.object({
  default: pricingPolicySchema.default({ components: [] }),
  overrides: z.record(z.string(), pricingPolicySchema).default({}),
});
export type PricingSettings = z.infer<typeof pricingSettingsSchema>;
