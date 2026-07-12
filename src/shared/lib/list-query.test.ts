import { describe, it, expect } from "vitest";

import { buildNameSort, paginate, pageMeta, toNumber, PAGE_SIZE } from "@/shared/lib/list-query";

describe("buildNameSort", () => {
  it("maps sort keys to Prisma orderBy fragments", () => {
    expect(buildNameSort("oldest")).toEqual({ createdAt: "asc" });
    expect(buildNameSort("name_asc")).toEqual({ name: "asc" });
    expect(buildNameSort("name_desc")).toEqual({ name: "desc" });
    expect(buildNameSort("newest")).toEqual({ createdAt: "desc" });
    expect(buildNameSort(undefined)).toEqual({ createdAt: "desc" });
  });
});

describe("paginate", () => {
  it("defaults to page 1 for missing or invalid pages", () => {
    expect(paginate(undefined)).toEqual({ page: 1, skip: 0, take: PAGE_SIZE });
    expect(paginate(0)).toEqual({ page: 1, skip: 0, take: PAGE_SIZE });
  });

  it("computes skip from page number", () => {
    expect(paginate(3)).toEqual({ page: 3, skip: 2 * PAGE_SIZE, take: PAGE_SIZE });
  });
});

describe("pageMeta", () => {
  it("computes page count and never returns 0 pages", () => {
    expect(pageMeta(0, 1)).toEqual({ total: 0, page: 1, pageSize: PAGE_SIZE, pageCount: 1 });
    expect(pageMeta(PAGE_SIZE + 1, 1).pageCount).toBe(2);
    expect(pageMeta(PAGE_SIZE, 1).pageCount).toBe(1);
  });
});

describe("toNumber", () => {
  it("returns null for null and unwraps Decimal-like values", () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber({ toNumber: () => 42.5 })).toBe(42.5);
  });
});
