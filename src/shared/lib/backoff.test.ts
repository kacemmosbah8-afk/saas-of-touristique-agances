import { describe, it, expect } from "vitest";

import { backoffDelayMs } from "@/shared/lib/backoff";

describe("backoffDelayMs", () => {
  it("grows exponentially with jitter within ±20%", () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const exact = 300 * 2 ** attempt;
      const delay = backoffDelayMs(attempt);
      expect(delay).toBeGreaterThanOrEqual(exact * 0.8 - 1);
      expect(delay).toBeLessThanOrEqual(exact * 1.2 + 1);
    }
  });

  it("honours a custom base", () => {
    const delay = backoffDelayMs(0, 30_000);
    expect(delay).toBeGreaterThanOrEqual(30_000 * 0.8);
    expect(delay).toBeLessThanOrEqual(30_000 * 1.2);
  });
});
