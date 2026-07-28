import { describe, it, expect } from "vitest";

import { invitationEmail } from "@/shared/lib/email/templates/invitation";

describe("invitationEmail", () => {
  const base = {
    tenantName: "Sunny Trails Travel",
    inviterName: "Jordan Lee",
    role: "AGENT",
    acceptUrl: "https://app.travelos.example/invite/abc123",
    expiresAt: new Date("2026-07-19T00:00:00Z"),
  };

  it("includes the inviter, tenant, and role in the subject", () => {
    const { subject } = invitationEmail(base);
    expect(subject).toContain("Jordan Lee");
    expect(subject).toContain("Sunny Trails Travel");
  });

  it("includes a working accept link in both bodies", () => {
    const { html, text } = invitationEmail(base);
    expect(html).toContain(base.acceptUrl);
    expect(text).toContain(base.acceptUrl);
  });

  it("escapes HTML-significant characters in the inviter name", () => {
    const { html } = invitationEmail({
      ...base,
      inviterName: `<img src=x onerror=alert(1)>`,
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
