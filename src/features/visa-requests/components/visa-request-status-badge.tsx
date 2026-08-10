import type { VisaRequestStatus } from "@prisma/client";

import { VISA_REQUEST_STATUS_LABELS } from "@/features/visa-requests/lib/status";
import { StatusBadge } from "@/shared/components/status-badge";
import type { StatusTone } from "@/shared/lib/status-tone";

const TONE: Record<VisaRequestStatus, StatusTone> = {
  PENDING: "warning",
  CONTACTED: "info",
  DOCUMENTS_REQUESTED: "special",
  IN_PROGRESS: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export function VisaRequestStatusBadge({ status }: { status: VisaRequestStatus }) {
  return <StatusBadge tone={TONE[status]}>{VISA_REQUEST_STATUS_LABELS[status]}</StatusBadge>;
}
