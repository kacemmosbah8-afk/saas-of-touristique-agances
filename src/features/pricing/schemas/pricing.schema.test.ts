import { describe, it, expect } from "vitest";

import {
  pricingComponentSchema,
  pricingPolicySchema,
  pricingSettingsSchema,
} from "@/features/pricing/schemas/pricing.schema";

describe("pricingComponentSchema", () => {
  it("accepts a valid component of every type", () => {
    const valid = [
      { type: "MARKUP_FIXED", amount: 10 },
      { type: "MARKUP_PERCENT", percent: 15 },
      { type: "COMMISSION_PERCENT", percent: 10 },
      { type: "FEE_FIXED", amount: 5 },
      { type: "FEE_PERCENT", percent: 2 },
      { type: "TAX_PERCENT", percent: 8 },
      { type: "DISCOUNT_FIXED", amount: 5 },
      { type: "DISCOUNT_PERCENT", percent: 10 },
      { type: "COUPON_FIXED", amount: 5, code: "SAVE5" },
      { type: "PROMO_PERCENT", percent: 5 },
      { type: "MIN_MARKUP_PERCENT", percent: 5 },
      { type: "MAX_MARKUP_PERCENT", percent: 50 },
      { type: "ROUND_TO_NEAREST", unit: 1 },
    ];
    for (const component of valid) {
      expect(pricingComponentSchema.safeParse(component).success).toBe(true);
    }
  });

  it("rejects a negative amount regardless of component type", () => {
    expect(pricingComponentSchema.safeParse({ type: "MARKUP_FIXED", amount: -1 }).success).toBe(false);
    expect(pricingComponentSchema.safeParse({ type: "FEE_FIXED", amount: -0.01 }).success).toBe(false);
    expect(pricingComponentSchema.safeParse({ type: "DISCOUNT_FIXED", amount: -10 }).success).toBe(false);
    expect(pricingComponentSchema.safeParse({ type: "COUPON_FIXED", amount: -10 }).success).toBe(false);
  });

  it("rejects a negative percent regardless of component type", () => {
    expect(pricingComponentSchema.safeParse({ type: "MARKUP_PERCENT", percent: -5 }).success).toBe(false);
    expect(pricingComponentSchema.safeParse({ type: "DISCOUNT_PERCENT", percent: -5 }).success).toBe(false);
    expect(pricingComponentSchema.safeParse({ type: "MIN_MARKUP_PERCENT", percent: -1 }).success).toBe(false);
    expect(pricingComponentSchema.safeParse({ type: "MAX_MARKUP_PERCENT", percent: -1 }).success).toBe(false);
  });

  it("rejects a non-positive ROUND_TO_NEAREST unit", () => {
    expect(pricingComponentSchema.safeParse({ type: "ROUND_TO_NEAREST", unit: 0 }).success).toBe(false);
    expect(pricingComponentSchema.safeParse({ type: "ROUND_TO_NEAREST", unit: -5 }).success).toBe(false);
  });

  it("rejects an unrecognized component type", () => {
    expect(pricingComponentSchema.safeParse({ type: "SOMETHING_ELSE", amount: 1 }).success).toBe(false);
  });
});

describe("pricingPolicySchema / pricingSettingsSchema", () => {
  it("defaults to an empty components array", () => {
    expect(pricingPolicySchema.parse({})).toEqual({ components: [] });
  });

  it("defaults a fully empty settings object to GLOBAL (no components anywhere)", () => {
    expect(pricingSettingsSchema.parse({})).toEqual({ default: { components: [] }, overrides: {} });
  });

  it("parses a tenant default plus supplier overrides", () => {
    const parsed = pricingSettingsSchema.parse({
      default: { components: [{ type: "MARKUP_PERCENT", percent: 12 }] },
      overrides: {
        HOTELBEDS: { components: [{ type: "MARKUP_PERCENT", percent: 20 }] },
      },
    });
    expect(parsed.default.components).toHaveLength(1);
    expect(parsed.overrides.HOTELBEDS.components[0]).toEqual({ type: "MARKUP_PERCENT", percent: 20 });
  });

  it("rejects a settings object carrying a negative-valued component anywhere", () => {
    const result = pricingSettingsSchema.safeParse({
      default: { components: [{ type: "MARKUP_PERCENT", percent: -5 }] },
      overrides: {},
    });
    expect(result.success).toBe(false);
  });
});
