import { describe, it, expect } from "vitest";

import { buildResendPayload } from "@/shared/lib/email/resend-provider";
import type { EmailMessage } from "@/shared/lib/email/types";

describe("buildResendPayload", () => {
  const message: EmailMessage = {
    to: "customer@example.com",
    subject: "Booking BK-2026-0007",
    html: "<p>Hi</p>",
  };

  it("wraps the recipient in an array and carries subject/html through", () => {
    const payload = buildResendPayload("TravelOS <noreply@travelos.app>", message);
    expect(payload).toEqual({
      from: "TravelOS <noreply@travelos.app>",
      to: ["customer@example.com"],
      subject: "Booking BK-2026-0007",
      html: "<p>Hi</p>",
    });
  });

  it("includes text and reply_to only when provided", () => {
    const payload = buildResendPayload("TravelOS <noreply@travelos.app>", {
      ...message,
      text: "Hi",
      replyTo: "agency@example.com",
    });
    expect(payload.text).toBe("Hi");
    expect(payload.reply_to).toBe("agency@example.com");
  });

  it("omits text/reply_to keys entirely when absent, rather than sending them empty", () => {
    const payload = buildResendPayload("TravelOS <noreply@travelos.app>", message);
    expect("text" in payload).toBe(false);
    expect("reply_to" in payload).toBe(false);
  });
});
