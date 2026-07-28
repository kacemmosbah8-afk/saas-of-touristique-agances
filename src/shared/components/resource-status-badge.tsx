import type { ResourceStatus } from "@prisma/client";

import { RESOURCE_STATUS_LABELS, RESOURCE_STATUS_TONE } from "@/shared/lib/resource-status";
import { StatusBadge } from "@/shared/components/status-badge";

export function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  return (
    <StatusBadge tone={RESOURCE_STATUS_TONE[status]}>
      {RESOURCE_STATUS_LABELS[status]}
    </StatusBadge>
  );
}
