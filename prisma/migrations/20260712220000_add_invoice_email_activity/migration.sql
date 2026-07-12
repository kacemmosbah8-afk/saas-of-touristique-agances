-- Sprint X, Milestone 1 — Outbound Email Delivery Infrastructure
-- Adds a single enum value so the existing InvoiceActivity timeline can
-- record "invoice issued email sent" without a new table.

ALTER TYPE "InvoiceActivityType" ADD VALUE 'EMAIL_SENT';
