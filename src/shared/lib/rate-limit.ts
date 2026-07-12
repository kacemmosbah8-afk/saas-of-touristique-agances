import "server-only";
import { headers } from "next/headers";

/**
 * Sliding-window rate limiter backed by an in-process Map.
 *
 * This implementation is correct and effective for single-instance deployments
 * (VPS, Docker, Railway). For serverless (Vercel / AWS Lambda), each function
 * instance has its own in-memory store, so the limits are per-instance rather
 * than global. Replace the `store` Map with @upstash/ratelimit + @upstash/redis
 * before running on multi-instance serverless infrastructure.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number; // epoch ms
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

const store = new Map<string, RateLimitRecord>();

// Prevent unbounded memory growth — clean expired keys every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of store) {
      if (record.resetAt < now) store.delete(key);
    }
  },
  5 * 60 * 1000,
).unref();

function check(key: string, maxRequests: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const record = store.get(key);

  if (!record || record.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt: new Date(resetAt) };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: new Date(record.resetAt) };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: new Date(record.resetAt),
  };
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "127.0.0.1"
  );
}

/** 10 sign-in attempts per (IP + email) per 15 minutes. */
export async function checkSignInRateLimit(email: string): Promise<RateLimitResult> {
  const ip = await getClientIp();
  return check(`sign-in:${ip}:${email.toLowerCase()}`, 10, 15 * 60 * 1000);
}

/** 5 sign-up attempts per IP per hour. */
export async function checkSignUpRateLimit(): Promise<RateLimitResult> {
  const ip = await getClientIp();
  return check(`sign-up:${ip}`, 5, 60 * 60 * 1000);
}

/**
 * 20 invitation sends per tenant per hour — generous for real team growth,
 * throttles the invite action being used to mass-email arbitrary addresses.
 * Keyed by tenant, not IP: the abuse case here is a compromised or malicious
 * member of one workspace, not a network-level actor.
 */
export async function checkInvitationRateLimit(tenantId: string): Promise<RateLimitResult> {
  return check(`invitation:${tenantId}`, 20, 60 * 60 * 1000);
}
