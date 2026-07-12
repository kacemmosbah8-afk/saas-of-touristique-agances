import "server-only";

import { logger } from "@/shared/lib/logger";
import {
  AuthenticationError,
  NetworkError,
  ProviderApiError,
  RateLimitError,
  asIntegrationError,
} from "@/features/integrations/lib/errors";
import {
  acquire,
  type RateLimitConfig,
} from "@/features/integrations/lib/rate-limiter";

/**
 * Shared HTTP core for every provider client: rate limiting, timeout,
 * retry with exponential backoff (honouring Retry-After), response-time
 * measurement, and structured logging. Providers never call fetch directly.
 */

export type ProviderRequest = {
  provider: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  /** Retries on 429/5xx/network failures. Default 2 (3 attempts total). */
  retries?: number;
  rateLimit?: RateLimitConfig;
};

export type ProviderResponse<T> = {
  status: number;
  data: T;
  durationMs: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  limit: 4,
  windowMs: 1_000,
  maxWaitMs: 3_000,
};

/** Exponential backoff with jitter: 300ms, 600ms, 1200ms… (±20%). */
export function backoffDelayMs(attempt: number, base = 300): number {
  const exact = base * 2 ** attempt;
  const jitter = exact * 0.2 * (Math.random() * 2 - 1);
  return Math.round(exact + jitter);
}

function retryAfterMs(res: Response): number | null {
  const header = res.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

export async function providerRequest<T = unknown>(
  req: ProviderRequest,
): Promise<ProviderResponse<T>> {
  const retries = req.retries ?? DEFAULT_RETRIES;
  const started = Date.now();
  const log = logger.child({ provider: req.provider, method: req.method, url: req.url });

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    await acquire(req.provider, req.rateLimit ?? DEFAULT_RATE_LIMIT);

    const attemptStarted = Date.now();
    let res: Response;
    try {
      res = await fetch(req.url, {
        method: req.method,
        headers: {
          Accept: "application/json",
          ...(req.body != null ? { "Content-Type": "application/json" } : {}),
          ...req.headers,
        },
        body: req.body != null ? JSON.stringify(req.body) : undefined,
        signal: AbortSignal.timeout(req.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (err) {
      lastError = asIntegrationError(req.provider, err);
      log.warn("provider request network failure", {
        attempt,
        error: String(err),
      });
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffDelayMs(attempt)));
        continue;
      }
      throw lastError;
    }

    const durationMs = Date.now() - attemptStarted;

    if (res.ok) {
      let data: T;
      try {
        data = (await res.json()) as T;
      } catch {
        data = undefined as T;
      }
      log.debug("provider request ok", { status: res.status, durationMs, attempt });
      return { status: res.status, data, durationMs: Date.now() - started };
    }

    // Error responses ---------------------------------------------------
    const bodyText = await res.text().catch(() => "");
    const detail = bodyText.slice(0, 500);

    if (res.status === 401 || res.status === 403) {
      log.error("provider auth failure", { status: res.status, durationMs });
      throw new AuthenticationError(req.provider, res.status);
    }

    if (res.status === 429) {
      const waitMs = retryAfterMs(res) ?? backoffDelayMs(attempt, 1000);
      log.warn("provider rate limited", { attempt, waitMs });
      lastError = new RateLimitError(req.provider, Math.ceil(waitMs / 1000));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 10_000)));
        continue;
      }
      throw lastError;
    }

    if (res.status >= 500) {
      log.warn("provider server error", { status: res.status, attempt, durationMs });
      lastError = new ProviderApiError(req.provider, res.status, detail);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffDelayMs(attempt)));
        continue;
      }
      throw lastError;
    }

    // 4xx (other than auth/429): not retryable.
    log.error("provider client error", { status: res.status, durationMs, detail });
    throw new ProviderApiError(req.provider, res.status, detail);
  }

  // Unreachable, but keeps TypeScript satisfied.
  throw lastError instanceof Error ? lastError : new NetworkError(req.provider);
}
