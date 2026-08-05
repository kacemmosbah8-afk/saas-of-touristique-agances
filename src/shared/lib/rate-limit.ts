import "server-only";
import { headers } from "next/headers";

import { prisma } from "@/shared/lib/db";

/**
 * Sliding-window rate limiter backed by the `cache_entries` table — the same
 * store `features/integrations/lib/cache.ts` uses — rather than in-process
 * memory. This deployment is licensed to a single agency (see PROJECT.md,
 * "Single-agency licensing"), but even a single Vercel deployment (see
 * `vercel.json`) runs multiple concurrent serverless function instances with
 * no shared memory between them, so an in-process counter never actually
 * limits anything in that environment — every instance starts counting from
 * zero.
 *
 * The read-then-write here isn't wrapped in a DB transaction, so two
 * requests arriving within the same few milliseconds can both slip through
 * once. That's an accepted tradeoff for a single-tenant, low-volume
 * deployment: it's a rate limiter against casual abuse (credential
 * stuffing, enumeration probing), not a distributed exact-count primitive.
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

const RATE_LIMIT_KEY_PREFIX = "rate-limit:";

/** Opportunistic cleanup of expired rate-limit rows — no cron required. */
async function maybeSweepExpired(): Promise<void> {
  if (Math.random() >= 0.01) return;
  await prisma.cacheEntry
    .deleteMany({
      where: { key: { startsWith: RATE_LIMIT_KEY_PREFIX }, expiresAt: { lt: new Date() } },
    })
    .catch(() => undefined);
}

async function check(key: string, maxRequests: number, windowMs: number): Promise<RateLimitResult> {
  void maybeSweepExpired();

  const cacheKey = `${RATE_LIMIT_KEY_PREFIX}${key}`;
  const now = Date.now();

  const existing = await prisma.cacheEntry.findUnique({ where: { key: cacheKey } });
  const record = existing?.value as RateLimitRecord | undefined;

  if (!record || record.resetAt < now) {
    const resetAt = now + windowMs;
    await prisma.cacheEntry.upsert({
      where: { key: cacheKey },
      create: { key: cacheKey, value: { count: 1, resetAt }, expiresAt: new Date(resetAt) },
      update: { value: { count: 1, resetAt }, expiresAt: new Date(resetAt) },
    });
    return { allowed: true, remaining: maxRequests - 1, resetAt: new Date(resetAt) };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: new Date(record.resetAt) };
  }

  const nextCount = record.count + 1;
  await prisma.cacheEntry.update({
    where: { key: cacheKey },
    data: { value: { count: nextCount, resetAt: record.resetAt } },
  });

  return { allowed: true, remaining: maxRequests - nextCount, resetAt: new Date(record.resetAt) };
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

/**
 * 5 portal access requests per (tenant + email) per hour — a legitimate
 * traveler retries a handful of times at most; higher than that is either a
 * mistake worth throttling gently or an attempt to enumerate bookings by
 * spamming the request form. Combined with `checkPortalAccessIpRateLimit`
 * below (the two are independent gates, both must pass).
 */
export async function checkPortalAccessRateLimit(tenantId: string, email: string): Promise<RateLimitResult> {
  return check(`portal-access:${tenantId}:${email.toLowerCase()}`, 5, 60 * 60 * 1000);
}

/**
 * 20 portal access requests per IP per hour, across all tenants/emails —
 * the defense against one actor probing many (bookingReference, email)
 * guesses to enumerate real bookings; the per-(tenant+email) limit alone
 * wouldn't catch that since every guess uses a different email.
 */
export async function checkPortalAccessIpRateLimit(ip: string): Promise<RateLimitResult> {
  return check(`portal-access-ip:${ip}`, 20, 60 * 60 * 1000);
}

/**
 * 5 change-password attempts per user per 15 minutes — the action requires
 * the current password, so it's a brute-force target just like sign-in.
 * Keyed by user id (already an authenticated session), not IP.
 */
export async function checkChangePasswordRateLimit(userId: string): Promise<RateLimitResult> {
  return check(`change-password:${userId}`, 5, 15 * 60 * 1000);
}
