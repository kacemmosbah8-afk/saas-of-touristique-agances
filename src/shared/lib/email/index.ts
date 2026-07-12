import "server-only";

import { logger } from "@/shared/lib/logger";
import { env } from "@/shared/config/env";
import { createResendProvider } from "@/shared/lib/email/resend-provider";
import type { EmailMessage, SendEmailResult } from "@/shared/lib/email/types";

export type { EmailMessage, SendEmailResult } from "@/shared/lib/email/types";

/**
 * Single entry point every feature calls to send an email — never import a
 * concrete provider directly. Resolves to Resend when `RESEND_API_KEY` /
 * `EMAIL_FROM` are configured; otherwise reports `not_configured` and logs a
 * warning, exactly like the supplier integrations report "not connected"
 * rather than throwing (see `resolveTenantCredentials`).
 *
 * This is a platform-level sender: TravelOS sends from one verified address
 * on behalf of every tenant for now. Per-tenant custom sending domains are a
 * later, separate capability, not something this milestone assumes.
 */
export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  if (!message.to || !message.to.includes("@")) {
    logger.warn("sendEmail called with no usable recipient", { subject: message.subject });
    return { ok: false, reason: "no_recipient" };
  }

  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    logger.warn("sendEmail: no email provider configured — send skipped", {
      subject: message.subject,
      to: message.to,
    });
    return { ok: false, reason: "not_configured" };
  }

  const provider = createResendProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
  const result = await provider.send(message);

  if (result.ok) {
    logger.info("email sent", { to: message.to, subject: message.subject });
  }

  return result;
}
