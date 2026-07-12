import { RateLimitError } from "@/features/integrations/lib/errors";

/**
 * In-process sliding-window rate limiter, keyed per provider. Keeps TravelOS
 * inside each provider's request quota and fails fast (instead of queueing
 * unboundedly) when a burst would exceed it.
 *
 * Note: per-instance by design. In a multi-instance deployment each instance
 * gets its own window, so configure limits with headroom below the real
 * provider quota. A Redis-backed limiter can replace this behind the same
 * `acquire` signature.
 */

type Window = { timestamps: number[] };

const windows = new Map<string, Window>();

export type RateLimitConfig = {
  /** Max requests allowed per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** How long acquire() may wait for capacity before throwing. */
  maxWaitMs: number;
};

function prune(win: Window, windowMs: number, now: number) {
  const cutoff = now - windowMs;
  while (win.timestamps.length > 0 && win.timestamps[0] <= cutoff) {
    win.timestamps.shift();
  }
}

/**
 * Reserve one request slot for `key`, waiting briefly if the window is full.
 * Throws RateLimitError when capacity cannot be obtained within maxWaitMs.
 */
export async function acquire(key: string, config: RateLimitConfig): Promise<void> {
  const deadline = Date.now() + config.maxWaitMs;

  for (;;) {
    const now = Date.now();
    let win = windows.get(key);
    if (!win) {
      win = { timestamps: [] };
      windows.set(key, win);
    }
    prune(win, config.windowMs, now);

    if (win.timestamps.length < config.limit) {
      win.timestamps.push(now);
      return;
    }

    const oldestExpiry = win.timestamps[0] + config.windowMs;
    const waitMs = Math.min(oldestExpiry - now + 5, deadline - now);
    if (waitMs <= 0 || now >= deadline) {
      throw new RateLimitError(key, Math.ceil((oldestExpiry - now) / 1000));
    }
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

/** Test hook: clear all windows. */
export function resetRateLimiter(): void {
  windows.clear();
}
