/**
 * Pure template for the Customer Portal magic-link email. Same shape as
 * `invitation.ts` — a plain function, no templating engine (see
 * PROJECT.md, "Communication Capability" for why).
 *
 * Unlike `invitation.ts` (sent staff-to-staff, so English-only matches the
 * rest of the admin dashboard), this one goes to a traveler — the same
 * audience as the public storefront, so it renders in whichever locale
 * they were browsing in, per the visitor's `NEXT_LOCALE` cookie.
 */

import type { Locale } from "@/shared/i18n/dictionary";

export type PortalMagicLinkEmailInput = {
  tenantName: string;
  customerFirstName: string;
  bookingReference: string;
  accessUrl: string;
  expiresAt: Date;
  locale: Locale;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTime(date: Date, locale: Locale): string {
  return date.toLocaleTimeString(locale === "ar" ? "ar" : "fr-FR", { timeStyle: "short" });
}

const copy: Record<
  Locale,
  {
    subject: (tenantName: string) => string;
    greeting: (name: string) => string;
    intro: (reference: string, tenantName: string) => string;
    linkLabel: string;
    expiryNotice: (time: string) => string;
    ignoreNotice: string;
  }
> = {
  ar: {
    subject: (tenantName) => `رابط الدخول إلى بوابة رحلتكم مع ${tenantName}`,
    greeting: (name) => `مرحبًا ${name}،`,
    intro: (reference, tenantName) =>
      `استخدموا هذا الرابط للاطلاع بأمان على حجزكم ${reference} مع ${tenantName}:`,
    linkLabel: "افتح بوابة رحلتك",
    expiryNotice: (time) => `ينتهي صلاحية هذا الرابط الساعة ${time} ويمكن استخدامه مرة واحدة فقط.`,
    ignoreNotice: "إذا لم تطلبوا هذا، يمكنكم تجاهل هذه الرسالة بأمان.",
  },
  fr: {
    subject: (tenantName) => `Votre lien de connexion à l'espace voyage ${tenantName}`,
    greeting: (name) => `Bonjour ${name},`,
    intro: (reference, tenantName) =>
      `Utilisez ce lien pour consulter en toute sécurité votre réservation ${reference} auprès de ${tenantName} :`,
    linkLabel: "Ouvrir votre espace voyage",
    expiryNotice: (time) => `Ce lien expire à ${time} et ne peut être utilisé qu'une seule fois.`,
    ignoreNotice: "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.",
  },
};

export function portalMagicLinkEmail(input: PortalMagicLinkEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const t = copy[input.locale];
  const subject = t.subject(input.tenantName);
  const expires = formatTime(input.expiresAt, input.locale);
  const greeting = t.greeting(input.customerFirstName);
  const intro = t.intro(input.bookingReference, input.tenantName);
  const expiryNotice = t.expiryNotice(expires);

  const text = `${greeting}\n\n${intro}\n\n${input.accessUrl}\n\n${expiryNotice} ${t.ignoreNotice}`;

  const html = `
<p>${escapeHtml(greeting)}</p>
<p>${escapeHtml(intro)}</p>
<p><a href="${escapeHtml(input.accessUrl)}">${escapeHtml(t.linkLabel)}</a></p>
<p>${escapeHtml(expiryNotice)}</p>
<p style="color:#6b7280;font-size:13px;">${escapeHtml(t.ignoreNotice)}</p>
`.trim();

  return { subject, html, text };
}
