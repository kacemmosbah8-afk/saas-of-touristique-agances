import { describe, it, expect } from "vitest";

import { emptyToNull, numOrNull } from "@/shared/lib/normalize";
import { statusWhere } from "@/shared/schemas/list.schema";

describe("emptyToNull", () => {
  it("maps empty/whitespace/nullish to null and trims otherwise", () => {
    expect(emptyToNull("")).toBeNull();
    expect(emptyToNull("   ")).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
    expect(emptyToNull(null)).toBeNull();
    expect(emptyToNull("  Marrakech ")).toBe("Marrakech");
  });
});

describe("numOrNull", () => {
  it("passes through numbers (including 0) and maps nullish to null", () => {
    expect(numOrNull(0)).toBe(0);
    expect(numOrNull(5)).toBe(5);
    expect(numOrNull(undefined)).toBeNull();
    expect(numOrNull(null)).toBeNull();
  });
});

describe("statusWhere", () => {
  it("always excludes soft-deleted rows and filters by status when set", () => {
    expect(statusWhere("all")).toEqual({ deletedAt: null });
    expect(statusWhere(undefined)).toEqual({ deletedAt: null });
    expect(statusWhere("ACTIVE")).toEqual({ deletedAt: null, status: "ACTIVE" });
    expect(statusWhere("ARCHIVED")).toEqual({ deletedAt: null, status: "ARCHIVED" });
  });
});
