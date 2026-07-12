import { describe, it, expect } from "vitest";

import { classifyExecutionFailure } from "@/features/supplier-execution/lib/error-classification";
import {
  AuthenticationError,
  NotConfiguredError,
  RateLimitError,
  NetworkError,
  ProviderApiError,
  IntegrationError,
} from "@/features/integrations/lib/errors";

describe("classifyExecutionFailure", () => {
  it("treats rate limits, network failures, and timeouts as retryable", () => {
    expect(classifyExecutionFailure(new RateLimitError("Duffel", 5)).retryable).toBe(true);
    expect(classifyExecutionFailure(new NetworkError("Duffel")).retryable).toBe(true);
    expect(
      classifyExecutionFailure(new IntegrationError("TIMEOUT", "t", "Duffel timed out")).retryable,
    ).toBe(true);
  });

  it("treats auth failures and missing configuration as permanent", () => {
    expect(classifyExecutionFailure(new AuthenticationError("Duffel", 401)).retryable).toBe(false);
    expect(classifyExecutionFailure(new NotConfiguredError("Duffel")).retryable).toBe(false);
  });

  it("treats a provider 5xx as retryable and a 4xx as permanent", () => {
    expect(classifyExecutionFailure(new ProviderApiError("Duffel", 503, "down")).retryable).toBe(
      true,
    );
    expect(
      classifyExecutionFailure(new ProviderApiError("Duffel", 422, "offer expired")).retryable,
    ).toBe(false);
  });

  it("treats an unrecognized error as permanent, never blind-retryable", () => {
    const result = classifyExecutionFailure(new Error("something unexpected"));
    expect(result.retryable).toBe(false);
  });

  it("always returns a safe, non-empty message", () => {
    expect(classifyExecutionFailure(new NetworkError("Duffel")).message.length).toBeGreaterThan(0);
  });
});
