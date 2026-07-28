/**
 * Provider-agnostic email contract. Mirrors the pattern in
 * `shared/lib/storage/types.ts` — feature code depends on this interface and
 * on `sendEmail()` (see index.ts), never on a concrete provider, so swapping
 * Resend for Postmark/SES later means writing one new adapter file.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback. Falls back to a stripped version of `html` if omitted. */
  text?: string;
  /** Reply-To header — typically the tenant's own contact address, once tenants have one. */
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; providerMessageId?: string }
  | {
      ok: false;
      /**
       * `not_configured`: no provider credentials — logged, never thrown, so a
       * feature action never fails because email isn't set up yet.
       * `no_recipient`: the message has no usable `to` address.
       * `provider_error`: the provider was called and rejected/failed the send.
       */
      reason: "not_configured" | "no_recipient" | "provider_error";
      detail?: string;
    };

export interface EmailProvider {
  send(message: EmailMessage): Promise<SendEmailResult>;
}
