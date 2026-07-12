import { IntegrationError, type IntegrationErrorCode } from "@/features/integrations/lib/errors";

/**
 * Classifies a supplier-call failure as worth retrying or not, built on top
 * of the existing `IntegrationError` hierarchy (not a parallel system).
 * Network hiccups, rate limits, and timeouts are transient; a rejected
 * offer, an authentication failure, or "not configured" never becomes true
 * by trying again.
 */
const RETRYABLE_CODES: readonly IntegrationErrorCode[] = ["RATE_LIMITED", "NETWORK", "TIMEOUT"];

export type ExecutionFailure = { retryable: boolean; message: string };

export function classifyExecutionFailure(err: unknown): ExecutionFailure {
  if (err instanceof IntegrationError) {
    if (err.code === "PROVIDER_API" && err.status != null) {
      // 5xx from the supplier is transient-shaped; 4xx (rejected offer,
      // expired price, invalid passenger data, ...) will not resolve itself.
      return { retryable: err.status >= 500, message: err.userMessage };
    }
    return { retryable: RETRYABLE_CODES.includes(err.code), message: err.userMessage };
  }
  // An unrecognized throw is treated as non-retryable — retrying blind
  // against an unknown failure mode is how a bug becomes a duplicate order.
  return { retryable: false, message: "Execution failed unexpectedly." };
}
