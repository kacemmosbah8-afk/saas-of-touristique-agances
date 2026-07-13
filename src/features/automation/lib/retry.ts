import { backoffDelayMs } from "@/shared/lib/backoff";

/**
 * A job's retry spacing is minutes, not milliseconds — 30s, 60s, 120s...
 * capped at 30 minutes so a job stuck failing for hours doesn't drift its
 * next attempt into next week. Reuses the same jitter formula the
 * integrations HTTP client uses for a single request's retries
 * (`shared/lib/backoff.ts`) with a job-appropriate base instead of a
 * second implementation of exponential backoff.
 */
const RETRY_BASE_MS = 30_000;
const RETRY_MAX_MS = 30 * 60_000;

/**
 * Pure — when a job's next attempt becomes claimable. `attempt` is
 * zero-indexed by *retry* number, not by how many attempts have run: 0 for
 * the delay before the first retry (~30s), 1 for the second (~60s), and so
 * on. Callers translate their own attempt counter accordingly — see the
 * comment at this function's call site in `engine.ts`.
 */
export function nextAvailableAt(attempt: number, now: Date = new Date()): Date {
  const delay = Math.min(backoffDelayMs(attempt, RETRY_BASE_MS), RETRY_MAX_MS);
  return new Date(now.getTime() + delay);
}
