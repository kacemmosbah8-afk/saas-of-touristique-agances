/**
 * Typed error hierarchy for the external integrations layer. Actions catch
 * `IntegrationError` and surface `userMessage` in ActionResult errors — raw
 * provider payloads and credentials never reach the client.
 */

export type IntegrationErrorCode =
  | "NOT_CONFIGURED"
  | "AUTHENTICATION"
  | "RATE_LIMITED"
  | "PROVIDER_API"
  | "NETWORK"
  | "TIMEOUT";

export class IntegrationError extends Error {
  constructor(
    public readonly code: IntegrationErrorCode,
    message: string,
    /** Safe to show to end users. */
    public readonly userMessage: string = message,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

export class NotConfiguredError extends IntegrationError {
  constructor(provider: string) {
    super(
      "NOT_CONFIGURED",
      `${provider} credentials are not configured`,
      `${provider} is not configured. Add its credentials to the environment.`,
    );
    this.name = "NotConfiguredError";
  }
}

export class AuthenticationError extends IntegrationError {
  constructor(provider: string, status?: number) {
    super(
      "AUTHENTICATION",
      `${provider} rejected the credentials (${status ?? "auth error"})`,
      `${provider} rejected the credentials. Check the configured keys.`,
      status,
    );
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends IntegrationError {
  constructor(
    provider: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(
      "RATE_LIMITED",
      `${provider} rate limit exceeded`,
      `${provider} rate limit reached. Try again shortly.`,
      429,
    );
    this.name = "RateLimitError";
  }
}

export class ProviderApiError extends IntegrationError {
  constructor(provider: string, status: number, detail?: string) {
    super(
      "PROVIDER_API",
      `${provider} returned ${status}${detail ? `: ${detail}` : ""}`,
      `${provider} returned an error (${status}).`,
      status,
    );
    this.name = "ProviderApiError";
  }
}

export class NetworkError extends IntegrationError {
  constructor(provider: string, cause?: string) {
    super(
      "NETWORK",
      `Network failure calling ${provider}${cause ? `: ${cause}` : ""}`,
      `Could not reach ${provider}. Check network connectivity.`,
    );
    this.name = "NetworkError";
  }
}

/** Normalize any thrown value into an IntegrationError. */
export function asIntegrationError(provider: string, err: unknown): IntegrationError {
  if (err instanceof IntegrationError) return err;
  if (err instanceof Error && err.name === "TimeoutError") {
    return new IntegrationError(
      "TIMEOUT",
      `${provider} request timed out`,
      `${provider} took too long to respond.`,
    );
  }
  return new NetworkError(provider, err instanceof Error ? err.message : String(err));
}
