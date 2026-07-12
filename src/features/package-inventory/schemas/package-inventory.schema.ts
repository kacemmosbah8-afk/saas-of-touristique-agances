import { z } from "zod";

export const INVENTORY_KINDS = [
  "hotel",
  "activity",
  "guide",
  "transport",
  "supplier",
] as const;
export type InventoryKind = (typeof INVENTORY_KINDS)[number];

export const attachInventorySchema = z.object({
  resourceId: z.string().cuid(),
  notes: z.string().trim().max(500).optional(),
});
export type AttachInventoryInput = z.infer<typeof attachInventorySchema>;

export const reorderInventorySchema = z.object({
  orderedIds: z.array(z.string().cuid()).min(1),
});
export type ReorderInventoryInput = z.infer<typeof reorderInventorySchema>;
