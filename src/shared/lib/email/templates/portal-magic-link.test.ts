import { describe, it, expect } from "vitest";

import { portalMagicLinkEmail } from "@/shared/lib/email/templates/portal-magic-link";

describe("portalMagicLinkEmail", () => {
  const base = {
    tenantName: "Sunny Trails Travel",
    customerFirstName: "Jamie",
    bookingReference: "BK-2026-0042",
    accessUrl: "https://app.travelos.example/portal/sunny-trails/verify?token=abc123",
    expiresAt: new Date("2026-07-19T00:15:00Z"),
    locale: "ar" as const,
  };

  it("includes the tenant name in the subject", () => {
    const { subject } = portalMagicLinkEmail(base);
    expect(subject).toContain("Sunny Trails Travel");
  });

  it("includes a working access link in both bodies", () => {
    const { html, text } = portalMagicLinkEmail(base);
    expect(html).toContain(base.accessUrl);
    expect(text).toContain(base.accessUrl);
  });

  it("includes the booking reference so the recipient can verify the email is genuine", () => {
    const { html, text } = portalMagicLinkEmail(base);
    expect(html).toContain(base.bookingReference);
    expect(text).toContain(base.bookingReference);
  });

  it("escapes HTML-significant characters in the customer name", () => {
    const { html } = portalMagicLinkEmail({
      ...base,
      customerFirstName: `<img src=x onerror=alert(1)>`,
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("renders in French when the visitor's locale is fr", () => {
    const { subject, html, text } = portalMagicLinkEmail({ ...base, locale: "fr" });
    expect(subject).toContain("Sunny Trails Travel");
    expect(html).toContain("Bonjour Jamie");
    expect(text).toContain("Bonjour Jamie");
  });
});
