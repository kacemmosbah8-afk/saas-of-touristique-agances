/**
 * Pure template for the team-invitation email. Same shape as
 * `invoice-issued.ts` — a plain function, no templating engine (see
 * PROJECT.md, "Communication Capability" for why).
 */

export type InvitationEmailInput = {
  tenantName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
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

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { dateStyle: "long" });
}

export function invitationEmail(input: InvitationEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `${input.inviterName} invited you to join ${input.tenantName} on TravelOS`;
  const expires = formatDate(input.expiresAt);

  const text =
    `${input.inviterName} has invited you to join ${input.tenantName} on TravelOS as ${input.role}.\n\n` +
    `Accept the invitation: ${input.acceptUrl}\n\n` +
    `This link expires on ${expires}.`;

  const html = `
<p>${escapeHtml(input.inviterName)} has invited you to join <strong>${escapeHtml(input.tenantName)}</strong> on TravelOS as <strong>${escapeHtml(input.role)}</strong>.</p>
<p><a href="${escapeHtml(input.acceptUrl)}">Accept the invitation</a></p>
<p>This link expires on ${escapeHtml(expires)}.</p>
`.trim();

  return { subject, html, text };
}
