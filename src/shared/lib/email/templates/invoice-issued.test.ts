import { describe, it, expect } from "vitest";

import { invoiceIssuedEmail } from "@/shared/lib/email/templates/invoice-issued";

describe("invoiceIssuedEmail", () => {
  const base = {
    tenantName: "Sunny Trails Travel",
    customerName: "Alex Rivera",
    invoiceReference: "INV-2026-0007",
    total: 1234.5,
    currency: "USD",
    dueDate: new Date("2026-08-15T00:00:00Z"),
  };

  it("includes the invoice reference, formatted amount, and due date in the subject", () => {
    const { subject } = invoiceIssuedEmail(base);
    expect(subject).toContain("INV-2026-0007");
    expect(subject).toContain("Sunny Trails Travel");
    expect(subject).toMatch(/\$1,234\.50/);
  });

  it("renders both html and text bodies with the customer and tenant names", () => {
    const { html, text } = invoiceIssuedEmail(base);
    expect(html).toContain("Alex Rivera");
    expect(html).toContain("INV-2026-0007");
    expect(text).toContain("Alex Rivera");
    expect(text).toContain("Sunny Trails Travel");
  });

  it("escapes HTML-significant characters in user-controlled fields", () => {
    const { html } = invoiceIssuedEmail({
      ...base,
      customerName: `<script>alert("x")</script>`,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("falls back to a manual currency format when Intl rejects the currency code", () => {
    const { subject } = invoiceIssuedEmail({ ...base, currency: "NOTREAL" });
    expect(subject).toContain("NOTREAL");
  });
});
