import { describe, it, expect } from "vitest";

import { resolveComponents } from "@/features/pricing/lib/resolve";
import type { PricingSettings } from "@/features/pricing/schemas/pricing.schema";

const EMPTY: PricingSettings = { default: { components: [] }, overrides: {} };

describe("resolveComponents", () => {
  it("falls back to GLOBAL (no components) when nothing is configured", () => {
    expect(resolveComponents(EMPTY, "HOTELBEDS")).toEqual([]);
  });

  it("uses the TENANT default when no supplier override exists", () => {
    const settings: PricingSettings = {
      default: { components: [{ type: "MARKUP_PERCENT", percent: 12 }] },
      overrides: {},
    };
    expect(resolveComponents(settings, "HOTELBEDS")).toEqual([{ type: "MARKUP_PERCENT", percent: 12 }]);
    expect(resolveComponents(settings, "DUFFEL")).toEqual([{ type: "MARKUP_PERCENT", percent: 12 }]);
  });

  it("prefers a SUPPLIER override over the TENANT default (most specific wins)", () => {
    const settings: PricingSettings = {
      default: { components: [{ type: "MARKUP_PERCENT", percent: 12 }] },
      overrides: { HOTELBEDS: { components: [{ type: "MARKUP_PERCENT", percent: 20 }] } },
    };
    expect(resolveComponents(settings, "HOTELBEDS")).toEqual([{ type: "MARKUP_PERCENT", percent: 20 }]);
    // Unaffected supplier still gets the tenant default.
    expect(resolveComponents(settings, "DUFFEL")).toEqual([{ type: "MARKUP_PERCENT", percent: 12 }]);
  });

  it("an explicit empty override means zero markup for that supplier, not 'unconfigured'", () => {
    const settings: PricingSettings = {
      default: { components: [{ type: "MARKUP_PERCENT", percent: 12 }] },
      overrides: { HOTELBEDS: { components: [] } },
    };
    expect(resolveComponents(settings, "HOTELBEDS")).toEqual([]);
  });

  it("is case-insensitive on the provider tag", () => {
    const settings: PricingSettings = {
      default: { components: [] },
      overrides: { HOTELBEDS: { components: [{ type: "MARKUP_FIXED", amount: 5 }] } },
    };
    expect(resolveComponents(settings, "hotelbeds")).toEqual([{ type: "MARKUP_FIXED", amount: 5 }]);
  });

  it("supports an arbitrary future supplier tag with zero provider-specific code", () => {
    const settings: PricingSettings = {
      default: { components: [{ type: "MARKUP_PERCENT", percent: 8 }] },
      overrides: { "NEW-WHOLESALER-2027": { components: [{ type: "MARKUP_PERCENT", percent: 25 }] } },
    };
    expect(resolveComponents(settings, "NEW-WHOLESALER-2027")).toEqual([
      { type: "MARKUP_PERCENT", percent: 25 },
    ]);
    // A supplier never mentioned in overrides still resolves via the same
    // generic default path — no new branch needed for it.
    expect(resolveComponents(settings, "SOME-OTHER-FUTURE-SUPPLIER")).toEqual([
      { type: "MARKUP_PERCENT", percent: 8 },
    ]);
  });

  it("multi-tenant: two tenants' settings never leak into each other's resolution", () => {
    const tenantA: PricingSettings = {
      default: { components: [{ type: "MARKUP_PERCENT", percent: 10 }] },
      overrides: {},
    };
    const tenantB: PricingSettings = {
      default: { components: [{ type: "MARKUP_PERCENT", percent: 30 }] },
      overrides: {},
    };
    expect(resolveComponents(tenantA, "HOTELBEDS")).toEqual([{ type: "MARKUP_PERCENT", percent: 10 }]);
    expect(resolveComponents(tenantB, "HOTELBEDS")).toEqual([{ type: "MARKUP_PERCENT", percent: 30 }]);
  });
});
