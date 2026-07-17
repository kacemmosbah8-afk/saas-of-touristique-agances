import { z } from "zod";

import { CONTENT_SYNC_DATASETS } from "@/features/content-sync/lib/types";

/**
 * A tenant's content-sync policy — stored as `TenantSettings.contentSyncSettings`
 * (a `Json` column, exactly like `crmSettings`/`pricingSettings`/etc.). `enabled`
 * is the only thing that starts or stops the self-rescheduling job chain (see
 * `handlers/sync-content.handler.ts`): a run always re-enqueues its own successor
 * regardless of success/failure, so disabling here is the one way to actually
 * stop recurrence.
 */
export const contentSyncSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  /** Bounded 1h–7d: frequent enough to stay fresh, never so tight it hammers the provider. */
  intervalMinutes: z.number().int().min(60).max(10_080).default(360),
  datasets: z.array(z.enum(CONTENT_SYNC_DATASETS)).min(1).default([...CONTENT_SYNC_DATASETS]),
});
export type ContentSyncSettings = z.infer<typeof contentSyncSettingsSchema>;
