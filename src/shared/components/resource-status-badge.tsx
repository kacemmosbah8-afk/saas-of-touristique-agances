import type { ResourceStatus } from "@prisma/client";

import {
  RESOURCE_STATUS_BADGE_CLASS,
  RESOURCE_STATUS_LABELS,
} from "@/shared/lib/resource-status";
import { cn } from "@/shared/lib/utils";

export function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        RESOURCE_STATUS_BADGE_CLASS[status],
      )}
    >
      {RESOURCE_STATUS_LABELS[status]}
    </span>
  );
}
