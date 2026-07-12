/**
 * Pure template for the "invoice issued" email — no I/O, easy to unit test.
 * Keep templates as plain functions returning subject/html/text, not a
 * templating engine: there are exactly four of these planned for this sprint
 * (see Sprint X plan), which doesn't justify the extra dependency yet.
 */

export type InvoiceIssuedEmailInput = {
  tenantName: string;
  customerName: string;
  invoiceReference: string;
  total: number;
  currency: string;
  dueDate: Date;
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { dateStyle: "long" });
}

export function invoiceIssuedEmail(input: InvoiceIssuedEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const amount = formatMoney(input.total, input.currency);
  const due = formatDate(input.dueDate);
  const subject = `Invoice ${input.invoiceReference} from ${input.tenantName} — ${amount} due ${due}`;

  const text =
    `Hi ${input.customerName},\n\n` +
    `${input.tenantName} has issued invoice ${input.invoiceReference} for ${amount}, due ${due}.\n\n` +
    `Please contact ${input.tenantName} to arrange payment.\n\n` +
    `— ${input.tenantName}`;

  const html = `
<p>Hi ${escapeHtml(input.customerName)},</p>
<p>${escapeHtml(input.tenantName)} has issued invoice <strong>${escapeHtml(input.invoiceReference)}</strong> for <strong>${escapeHtml(amount)}</strong>, due <strong>${escapeHtml(due)}</strong>.</p>
<p>Please contact ${escapeHtml(input.tenantName)} to arrange payment.</p>
<p>— ${escapeHtml(input.tenantName)}</p>
`.trim();

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
