import { describe, it, expect } from "vitest";

import { hasFeature } from "@/features/billing/lib/entitlements";

describe("hasFeature", () => {
  it("returns true when the plan's feature list includes the key", () => {
    expect(hasFeature({ features: ["core", "supplier_execution"] }, "supplier_execution")).toBe(true);
  });

  it("returns false when it doesn't", () => {
    expect(hasFeature({ features: ["core"] }, "supplier_execution")).toBe(false);
  });

  it("returns false for an empty feature list", () => {
    expect(hasFeature({ features: [] }, "core")).toBe(false);
  });
});
