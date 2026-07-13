import { describe, it, expect } from "vitest";

import { authConfig } from "@/shared/lib/auth.config";

/**
 * The `authorized` callback is the edge-level gate every request passes
 * through before a route's own server-side checks run — a mistake here
 * either locks out real users or, worse, opens an unauthenticated path to
 * a route that should require sign-in. Worth pinning down explicitly,
 * especially the new `/invite/[token]` prefix rule added alongside Team
 * Invitations (it must stay reachable signed OUT, since the page renders
 * sign-in/sign-up inline).
 */
function callAuthorized(pathname: string, authed: boolean) {
  const authorized = authConfig.callbacks.authorized as (args: {
    auth: { user: object } | null;
    request: { nextUrl: URL };
  }) => boolean;
  return authorized({
    auth: authed ? { user: {} } : null,
    request: { nextUrl: new URL(`http://localhost${pathname}`) },
  });
}

describe("authConfig.callbacks.authorized", () => {
  it("allows the exact public routes when signed out", () => {
    expect(callAuthorized("/", false)).toBe(true);
    expect(callAuthorized("/sign-in", false)).toBe(true);
    expect(callAuthorized("/sign-up", false)).toBe(true);
  });

  it("allows any /invite/<token> path when signed out", () => {
    expect(callAuthorized("/invite/abc123", false)).toBe(true);
    expect(callAuthorized("/invite/very-long-token-value", false)).toBe(true);
  });

  it("allows every public marketing and legal page when signed out", () => {
    for (const path of [
      "/features",
      "/solutions",
      "/pricing",
      "/about",
      "/contact",
      "/terms",
      "/privacy",
      "/refund-policy",
      "/cookie-policy",
    ]) {
      expect(callAuthorized(path, false)).toBe(true);
    }
  });

  it("allows the SEO/verification metadata routes when signed out — a crawler is never authenticated", () => {
    for (const path of ["/robots.txt", "/sitemap.xml", "/icon", "/opengraph-image"]) {
      expect(callAuthorized(path, false)).toBe(true);
    }
  });

  it("blocks an arbitrary tenant route when signed out", () => {
    expect(callAuthorized("/acme-travel/bookings", false)).toBe(false);
    expect(callAuthorized("/onboarding", false)).toBe(false);
  });

  it("does not treat '/invited-elsewhere' as matching the /invite/ prefix", () => {
    expect(callAuthorized("/invited-elsewhere", false)).toBe(false);
  });

  it("allows any route once signed in", () => {
    expect(callAuthorized("/acme-travel/bookings", true)).toBe(true);
    expect(callAuthorized("/invite/abc123", true)).toBe(true);
  });
});
