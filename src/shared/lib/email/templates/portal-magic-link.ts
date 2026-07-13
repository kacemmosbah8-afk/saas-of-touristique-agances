/**
 * Pure template for the Customer Portal magic-link email. Same shape as
 * `invitation.ts` — a plain function, no templating engine (see
 * PROJECT.md, "Communication Capability" for why).
 */

export type PortalMagicLinkEmailInput = {
  tenantName: string;
  customerFirstName: string;
  bookingReference: string;
  accessUrl: string;
  expiresAt: Date;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { timeStyle: "short" });
}

export function portalMagicLinkEmail(input: PortalMagicLinkEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your ${input.tenantName} trip portal sign-in link`;
  const expires = formatTime(input.expiresAt);

  const text =
    `Hi ${input.customerFirstName},\n\n` +
    `Use this link to securely view booking ${input.bookingReference} with ${input.tenantName}:\n\n` +
    `${input.accessUrl}\n\n` +
    `This link expires at ${expires} and can only be used once. ` +
    `If you didn't request this, you can safely ignore this email.`;

  const html = `
<p>Hi ${escapeHtml(input.customerFirstName)},</p>
<p>Use this link to securely view booking <strong>${escapeHtml(input.bookingReference)}</strong> with <strong>${escapeHtml(input.tenantName)}</strong>:</p>
<p><a href="${escapeHtml(input.accessUrl)}">Open your trip portal</a></p>
<p>This link expires at ${escapeHtml(expires)} and can only be used once.</p>
<p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
`.trim();

  return { subject, html, text };
}
