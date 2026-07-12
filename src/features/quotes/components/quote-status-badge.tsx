import type { QuoteStatus } from "@prisma/client";

import { QUOTE_STATUS_LABELS } from "@/features/quotes/lib/quote-status";
import { cn } from "@/shared/lib/utils";

const STYLES: Record<QuoteStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  ACCEPTED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  DECLINED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  EXPIRED: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  CONVERTED: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );
}
