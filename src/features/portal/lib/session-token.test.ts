import { describe, it, expect } from "vitest";

import {
  generateSessionToken,
  sessionExpiryDate,
  isSessionExpired,
} from "@/features/portal/lib/session-token";

describe("generateSessionToken", () => {
  it("produces a URL-safe, high-entropy token", () => {
    const token = generateSessionToken();
    expect(token.length).toBeGreaterThan(30);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never repeats across calls", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateSessionToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("sessionExpiryDate", () => {
  it("is 14 days after the given date", () => {
    const from = new Date("2026-07-12T00:00:00Z");
    const expiry = sessionExpiryDate(from);
    expect(expiry.toISOString()).toBe("2026-07-26T00:00:00.000Z");
  });
});

describe("isSessionExpired", () => {
  it("is false before the expiry instant and true at/after it", () => {
    const expiresAt = new Date("2026-07-26T00:00:00Z");
    expect(isSessionExpired(expiresAt, new Date("2026-07-25T23:59:59Z"))).toBe(false);
    expect(isSessionExpired(expiresAt, new Date("2026-07-26T00:00:00Z"))).toBe(true);
    expect(isSessionExpired(expiresAt, new Date("2026-07-27T00:00:00Z"))).toBe(true);
  });
});
