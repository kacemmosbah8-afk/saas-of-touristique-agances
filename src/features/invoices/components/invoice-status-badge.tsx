import type { InvoiceStatus } from "@prisma/client";

import { INVOICE_STATUS_LABELS } from "@/features/invoices/lib/invoice-status";
import { StatusBadge } from "@/shared/components/status-badge";
import type { StatusTone } from "@/shared/lib/status-tone";

const TONE: Record<InvoiceStatus, StatusTone> = {
  DRAFT: "neutral",
  ISSUED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  VOID: "danger",
};

export function InvoiceStatusBadge({
  status,
  overdue,
}: {
  status: InvoiceStatus;
  /** Derived flag (see invoice-status.ts) — shown as a second chip. */
  overdue?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusBadge tone={TONE[status]}>{INVOICE_STATUS_LABELS[status]}</StatusBadge>
      {overdue && <StatusBadge tone="danger">Overdue</StatusBadge>}
    </span>
  );
}
