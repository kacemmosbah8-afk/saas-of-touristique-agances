import { z } from "zod";

/**
 * Base list-filters schema shared by every Suppliers & Inventory module.
 * Individual modules extend it with resource-specific filters (type, stars, …)
 * via `.extend({ ... })`.
 */
export const baseListFiltersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED", "all"]).optional(),
  sort: z.enum(["newest", "oldest", "name_asc", "name_desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export type BaseListFilters = z.infer<typeof baseListFiltersSchema>;

/** Build a Prisma status/deletedAt where-fragment from parsed filters. */
export function statusWhere(status: BaseListFilters["status"]) {
  return {
    deletedAt: null,
    ...(status && status !== "all" ? { status } : {}),
  };
}
