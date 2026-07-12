import { describe, it, expect, beforeEach } from "vitest";

import { acquire, resetRateLimiter } from "@/features/integrations/lib/rate-limiter";
import { RateLimitError } from "@/features/integrations/lib/errors";

describe("rate limiter", () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it("allows requests within the limit", async () => {
    const config = { limit: 3, windowMs: 1000, maxWaitMs: 10 };
    await acquire("test-a", config);
    await acquire("test-a", config);
    await acquire("test-a", config);
    // No throw — all three fit the window.
  });

  it("throws RateLimitError when the window is full and wait budget is tiny", async () => {
    const config = { limit: 2, windowMs: 5000, maxWaitMs: 10 };
    await acquire("test-b", config);
    await acquire("test-b", config);
    await expect(acquire("test-b", config)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("tracks keys independently", async () => {
    const config = { limit: 1, windowMs: 5000, maxWaitMs: 10 };
    await acquire("test-c", config);
    await acquire("test-d", config); // different key — no throw
    await expect(acquire("test-c", config)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("frees capacity after the window slides", async () => {
    const config = { limit: 1, windowMs: 50, maxWaitMs: 500 };
    await acquire("test-e", config);
    // Second acquire waits for the window to slide instead of throwing.
    await acquire("test-e", config);
  });
});
