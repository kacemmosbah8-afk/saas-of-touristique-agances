import { describe, it, expect } from "vitest";

import { authConfig } from "@/shared/lib/auth.config";

/**
 * The `authorized` callback is the edge-level gate every request passes
 * through before a route's own server-side checks run — a mistake here
 * either locks out real users or, worse, opens an unauthenticated path to
 * a route that should require sign-in. This deployment's default surface
 * is public (the agency's own customer website), so the callback is
 * deny-by-exception: only the admin panel and first-run onboarding require
 * a session, everything else falls through to allowed.
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
  it("allows TravelOS's own marketing, legal, and auth pages when signed out", () => {
    for (const path of [
      "/",
      "/sign-in",
      "/sign-up",
      "/features",
      "/solutions",
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

  it("allows any /invite/<token> path when signed out", () => {
    expect(callAuthorized("/invite/abc123", false)).toBe(true);
    expect(callAuthorized("/invite/very-long-token-value", false)).toBe(true);
  });

  it("allows the entire customer portal when signed out — travelers never hold a staff session", () => {
    expect(callAuthorized("/portal/acme-travel", false)).toBe(true);
    expect(callAuthorized("/portal/acme-travel/bookings/xyz", false)).toBe(true);
  });

  it("allows the agency's public storefront — bare tenant slug and any non-admin sub-path — when signed out", () => {
    expect(callAuthorized("/acme-travel", false)).toBe(true);
    expect(callAuthorized("/acme-travel/packages", false)).toBe(true);
    expect(callAuthorized("/acme-travel/packages/bali-adventure", false)).toBe(true);
    expect(callAuthorized("/acme-travel/contact", false)).toBe(true);
  });

  it("blocks the admin panel — /<tenantSlug>/admin and everything nested under it — when signed out", () => {
    expect(callAuthorized("/acme-travel/admin", false)).toBe(false);
    expect(callAuthorized("/acme-travel/admin/bookings", false)).toBe(false);
    expect(callAuthorized("/acme-travel/admin/settings", false)).toBe(false);
  });

  it("does not treat an 'admin' segment deeper than the tenant slug as the admin panel", () => {
    // e.g. a package literally named/slugged "admin" on the public site
    expect(callAuthorized("/acme-travel/packages/admin", false)).toBe(true);
  });

  it("blocks /onboarding when signed out", () => {
    expect(callAuthorized("/onboarding", false)).toBe(false);
  });

  it("allows every route once signed in", () => {
    expect(callAuthorized("/acme-travel/admin/bookings", true)).toBe(true);
    expect(callAuthorized("/onboarding", true)).toBe(true);
    expect(callAuthorized("/invite/abc123", true)).toBe(true);
  });
});
