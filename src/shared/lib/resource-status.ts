import type { ResourceStatus } from "@prisma/client";

import type { StatusTone } from "@/shared/lib/status-tone";

/**
 * Shared presentation + filter metadata for the M2 `ResourceStatus` enum,
 * used by every Suppliers & Inventory module (hotels, transport, guides,
 * suppliers, activities, destinations).
 */
export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

export const RESOURCE_STATUS_OPTIONS: { value: ResourceStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

export const RESOURCE_STATUS_TONE: Record<ResourceStatus, StatusTone> = {
  ACTIVE: "success",
  INACTIVE: "warning",
  ARCHIVED: "neutral",
};
