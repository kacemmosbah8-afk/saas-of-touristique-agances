import { describe, it, expect } from "vitest";

import {
  generateInvitationToken,
  invitationExpiryDate,
  isInvitationExpired,
} from "@/features/tenants/lib/invitation-token";

describe("generateInvitationToken", () => {
  it("produces a URL-safe, high-entropy token", () => {
    const token = generateInvitationToken();
    expect(token.length).toBeGreaterThan(30);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("never repeats across calls", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateInvitationToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("invitationExpiryDate", () => {
  it("is 7 days after the given date", () => {
    const from = new Date("2026-07-12T00:00:00Z");
    const expiry = invitationExpiryDate(from);
    expect(expiry.toISOString()).toBe("2026-07-19T00:00:00.000Z");
  });
});

describe("isInvitationExpired", () => {
  it("is false before the expiry instant and true at/after it", () => {
    const expiresAt = new Date("2026-07-19T00:00:00Z");
    expect(isInvitationExpired(expiresAt, new Date("2026-07-18T23:59:59Z"))).toBe(false);
    expect(isInvitationExpired(expiresAt, new Date("2026-07-19T00:00:00Z"))).toBe(true);
    expect(isInvitationExpired(expiresAt, new Date("2026-07-20T00:00:00Z"))).toBe(true);
  });
});
