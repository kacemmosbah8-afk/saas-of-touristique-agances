import type { QuoteStatus } from "@prisma/client";

import { QUOTE_STATUS_LABELS } from "@/features/quotes/lib/quote-status";
import { StatusBadge } from "@/shared/components/status-badge";
import type { StatusTone } from "@/shared/lib/status-tone";

const TONE: Record<QuoteStatus, StatusTone> = {
  DRAFT: "neutral",
  SENT: "info",
  ACCEPTED: "success",
  DECLINED: "danger",
  EXPIRED: "warning",
  CONVERTED: "special",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <StatusBadge tone={TONE[status]}>{QUOTE_STATUS_LABELS[status]}</StatusBadge>;
}
