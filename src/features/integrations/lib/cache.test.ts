import { describe, it, expect, vi } from "vitest";

import { MemoryCacheStore, cacheKey } from "@/features/integrations/lib/cache";

describe("cacheKey", () => {
  it("namespaces and normalizes parts", () => {
    expect(cacheKey("Amadeus", "Airports", "New York")).toBe("amadeus:airports:new_york");
    expect(cacheKey("hotelbeds", "avail", "PMI", 2)).toBe("hotelbeds:avail:pmi:2");
  });
});

describe("MemoryCacheStore", () => {
  it("stores and retrieves values within TTL", async () => {
    const store = new MemoryCacheStore();
    await store.set("k", { a: 1 }, 60);
    expect(await store.get("k")).toEqual({ a: 1 });
  });

  it("expires values after TTL", async () => {
    vi.useFakeTimers();
    const store = new MemoryCacheStore();
    await store.set("k", "v", 1);
    vi.advanceTimersByTime(1500);
    expect(await store.get("k")).toBeNull();
    vi.useRealTimers();
  });

  it("deletes values", async () => {
    const store = new MemoryCacheStore();
    await store.set("k", "v", 60);
    await store.delete("k");
    expect(await store.get("k")).toBeNull();
  });
});
