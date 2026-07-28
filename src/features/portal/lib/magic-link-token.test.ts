import { describe, it, expect } from "vitest";

import {
  generateMagicLinkToken,
  magicLinkExpiryDate,
  isMagicLinkExpired,
} from "@/features/portal/lib/magic-link-token";

describe("generateMagicLinkToken", () => {
  it("produces a URL-safe, high-entropy token", () => {
    const token = generateMagicLinkToken();
    expect(token.length).toBeGreaterThan(30);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never repeats across calls", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateMagicLinkToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("magicLinkExpiryDate", () => {
  it("is 15 minutes after the given date", () => {
    const from = new Date("2026-07-12T00:00:00Z");
    const expiry = magicLinkExpiryDate(from);
    expect(expiry.toISOString()).toBe("2026-07-12T00:15:00.000Z");
  });
});

describe("isMagicLinkExpired", () => {
  it("is false before the expiry instant and true at/after it", () => {
    const expiresAt = new Date("2026-07-12T00:15:00Z");
    expect(isMagicLinkExpired(expiresAt, new Date("2026-07-12T00:14:59Z"))).toBe(false);
    expect(isMagicLinkExpired(expiresAt, new Date("2026-07-12T00:15:00Z"))).toBe(true);
    expect(isMagicLinkExpired(expiresAt, new Date("2026-07-12T00:16:00Z"))).toBe(true);
  });
});
