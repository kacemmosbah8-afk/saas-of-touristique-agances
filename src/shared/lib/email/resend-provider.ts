import "server-only";

import { logger } from "@/shared/lib/logger";
import type { EmailMessage, EmailProvider, SendEmailResult } from "@/shared/lib/email/types";

/**
 * Resend adapter, called via raw `fetch` against their REST API rather than
 * the `resend` SDK — the same choice already made for the other external
 * provider clients (see `features/integrations/lib/http.ts`), and it keeps
 * this module dependency-free. This is a platform-level sender (one TravelOS
 * account, not a per-tenant credential like the supplier integrations), so
 * it deliberately does NOT reuse `features/integrations/lib/http.ts` — that
 * module belongs to the integrations feature slice and is wired to
 * per-tenant rate limiting; `shared/lib` must not depend on `features/*`.
 *
 * No retry loop here by design: a failed send is reported to the caller,
 * who logs it and moves on (see index.ts) rather than blocking the
 * triggering action. Retry-on-failure is deferred to the background-job
 * milestone (Sprint X, Milestone 5), not duplicated ad hoc here.
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;

type ResendPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
};

/** Pure request-body builder — kept separate from the fetch call so it's unit-testable. */
export function buildResendPayload(from: string, message: EmailMessage): ResendPayload {
  return {
    from,
    to: [message.to],
    subject: message.subject,
    html: message.html,
    ...(message.text ? { text: message.text } : {}),
    ...(message.replyTo ? { reply_to: message.replyTo } : {}),
  };
}

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<SendEmailResult> {
    const payload = buildResendPayload(this.from, message);

    let res: Response;
    try {
      res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (err) {
      logger.error("resend request failed", { error: String(err) });
      return { ok: false, reason: "provider_error", detail: String(err) };
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logger.error("resend rejected send", { status: res.status, detail: detail.slice(0, 300) });
      return { ok: false, reason: "provider_error", detail: detail.slice(0, 300) };
    }

    const body = await res.json().catch(() => null);
    const providerMessageId =
      body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
        ? (body as { id: string }).id
        : undefined;

    return { ok: true, providerMessageId };
  }
}

export function createResendProvider(apiKey: string, from: string): ResendEmailProvider {
  return new ResendEmailProvider(apiKey, from);
}
