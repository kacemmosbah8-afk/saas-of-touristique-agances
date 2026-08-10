import type { VisaRequestStatus } from "@prisma/client";

/**
 * Visa request lifecycle transition rules. Pure and side-effect free —
 * mirrors `booking-requests/lib/status.ts`. The DB does not enforce this.
 * Unlike BookingRequest's CONFIRMED, no state here is system-only/derived —
 * every status is a manual staff action, so all statuses appear in the
 * admin dropdown.
 *
 *   PENDING ──▶ CONTACTED ──▶ DOCUMENTS_REQUESTED ──▶ IN_PROGRESS ──▶ APPROVED
 *      │             │                │                    │
 *      └─────────────┴────────────────┴────────────────────┴──▶ REJECTED / CANCELLED
 */
const ALLOWED_TRANSITIONS: Record<VisaRequestStatus, readonly VisaRequestStatus[]> = {
  PENDING: ["CONTACTED", "DOCUMENTS_REQUESTED", "IN_PROGRESS", "APPROVED", "REJECTED", "CANCELLED"],
  CONTACTED: ["PENDING", "DOCUMENTS_REQUESTED", "IN_PROGRESS", "APPROVED", "REJECTED", "CANCELLED"],
  DOCUMENTS_REQUESTED: ["CONTACTED", "IN_PROGRESS", "APPROVED", "REJECTED", "CANCELLED"],
  IN_PROGRESS: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const VISA_REQUEST_STATUSES = [
  "PENDING",
  "CONTACTED",
  "DOCUMENTS_REQUESTED",
  "IN_PROGRESS",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export const VISA_REQUEST_STATUS_LABELS: Record<VisaRequestStatus, string> = {
  PENDING: "قيد الانتظار",
  CONTACTED: "تم التواصل",
  DOCUMENTS_REQUESTED: "مطلوب مستندات إضافية",
  IN_PROGRESS: "قيد المعالجة",
  APPROVED: "تمت الموافقة",
  REJECTED: "مرفوض",
  CANCELLED: "ملغى",
};

export function canTransition(from: VisaRequestStatus, to: VisaRequestStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: VisaRequestStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
