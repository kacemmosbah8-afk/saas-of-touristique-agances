import { describe, it, expect } from "vitest";

import { nextAvailableAt } from "@/features/automation/lib/retry";

describe("nextAvailableAt", () => {
  it("is in the future, growing with attempt number even accounting for jitter", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const first = nextAvailableAt(0, now); // ~30s ±20% => 24s-36s
    const second = nextAvailableAt(1, now); // ~60s ±20% => 48s-72s
    expect(first.getTime()).toBeGreaterThan(now.getTime());
    expect(second.getTime()).toBeGreaterThan(first.getTime());
  });

  it("caps growth at 30 minutes", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const far = nextAvailableAt(20, now);
    expect(far.getTime() - now.getTime()).toBeLessThanOrEqual(30 * 60_000 * 1.21);
  });
});
