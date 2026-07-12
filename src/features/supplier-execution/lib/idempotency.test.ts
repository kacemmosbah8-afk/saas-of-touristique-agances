import { describe, it, expect } from "vitest";

import { buildIdempotencyKey } from "@/features/supplier-execution/lib/idempotency";

describe("buildIdempotencyKey", () => {
  it("is deterministic for the same inputs", () => {
    expect(buildIdempotencyKey("item_123", 1)).toBe(buildIdempotencyKey("item_123", 1));
  });

  it("differs across booking items", () => {
    expect(buildIdempotencyKey("item_123", 1)).not.toBe(buildIdempotencyKey("item_456", 1));
  });

  it("differs across generations of the same item", () => {
    expect(buildIdempotencyKey("item_123", 1)).not.toBe(buildIdempotencyKey("item_123", 2));
  });

  it("defaults to generation 1", () => {
    expect(buildIdempotencyKey("item_123")).toBe(buildIdempotencyKey("item_123", 1));
  });
});
