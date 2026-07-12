import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";

import { hotelbedsSignature } from "@/features/integrations/providers/hotelbeds/hotelbeds-signature";

describe("hotelbedsSignature", () => {
  it("produces sha256 hex of key+secret+timestamp", () => {
    const expected = createHash("sha256").update("keySECRET1700000000").digest("hex");
    expect(hotelbedsSignature("key", "SECRET", 1_700_000_000)).toBe(expected);
  });

  it("changes when any input changes", () => {
    const base = hotelbedsSignature("k", "s", 1);
    expect(hotelbedsSignature("k2", "s", 1)).not.toBe(base);
    expect(hotelbedsSignature("k", "s2", 1)).not.toBe(base);
    expect(hotelbedsSignature("k", "s", 2)).not.toBe(base);
  });

  it("is 64 lowercase hex chars", () => {
    expect(hotelbedsSignature("a", "b", 123)).toMatch(/^[0-9a-f]{64}$/);
  });
});
