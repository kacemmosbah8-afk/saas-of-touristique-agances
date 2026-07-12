import type { ResourceStatus } from "@prisma/client";

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

export const RESOURCE_STATUS_BADGE_CLASS: Record<ResourceStatus, string> = {
  ACTIVE:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400",
  INACTIVE:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-400",
  ARCHIVED:
    "bg-muted text-muted-foreground ring-border",
};
