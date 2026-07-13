/**
 * Exponential backoff with jitter — shared by the integrations HTTP client
 * (`features/integrations/lib/http.ts`, retrying a single provider call
 * within one request) and the Platform Automation Capability's retry
 * scheduling (`features/automation/lib/retry.ts`, spacing out a job's
 * next attempt by minutes, not milliseconds). Same formula, different
 * `base` — one place to get the jitter math right, not two.
 */
export function backoffDelayMs(attempt: number, base = 300): number {
  const exact = base * 2 ** attempt;
  const jitter = exact * 0.2 * (Math.random() * 2 - 1);
  return Math.round(exact + jitter);
}
