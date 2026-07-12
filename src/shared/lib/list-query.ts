/**
 * Shared list/pagination helpers used by every module's list query. Keeps
 * page size, sort mapping, and page-metadata math in one place so all list
 * views behave identically.
 */

export const PAGE_SIZE = 24;

export type SortKey = "newest" | "oldest" | "name_asc" | "name_desc";

export function buildNameSort(sort: SortKey | undefined) {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" as const };
    case "name_asc":
      return { name: "asc" as const };
    case "name_desc":
      return { name: "desc" as const };
    default:
      return { createdAt: "desc" as const };
  }
}

export function paginate(page: number | undefined) {
  const current = page && page > 0 ? page : 1;
  return { page: current, skip: (current - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

export function pageMeta(total: number, page: number) {
  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Decimal → number for crossing the Server→Client boundary. */
export function toNumber(value: { toNumber(): number } | null): number | null {
  return value == null ? null : value.toNumber();
}
