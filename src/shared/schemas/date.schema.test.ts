import { describe, expect, it } from "vitest";

import { dateRangeRefinement, optionalDateString } from "@/shared/schemas/date.schema";

describe("optionalDateString", () => {
  it("accepts empty/undefined", () => {
    expect(optionalDateString().safeParse("").success).toBe(true);
    expect(optionalDateString().safeParse(undefined).success).toBe(true);
  });

  it("accepts a valid YYYY-MM-DD date", () => {
    expect(optionalDateString().safeParse("2026-08-01").success).toBe(true);
  });

  it("rejects a malformed date with the invalid-format message", () => {
    const result = optionalDateString().safeParse("not-a-date");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("Invalid date");
  });

  it("rejects a past date only when notInPast is set", () => {
    const past = "2000-01-01";
    expect(optionalDateString().safeParse(past).success).toBe(true);

    const result = optionalDateString({ notInPast: true }).safeParse(past);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("Date can't be in the past");
  });

  it("accepts today when notInPast is set", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(optionalDateString({ notInPast: true }).safeParse(today).success).toBe(true);
  });
});

describe("dateRangeRefinement", () => {
  const [predicate] = dateRangeRefinement("start", "end");

  it("passes when end is after start", () => {
    expect(predicate({ start: "2026-08-01", end: "2026-08-10" })).toBe(true);
  });

  it("passes when end equals start", () => {
    expect(predicate({ start: "2026-08-01", end: "2026-08-01" })).toBe(true);
  });

  it("fails when end is before start", () => {
    expect(predicate({ start: "2026-08-10", end: "2026-08-01" })).toBe(false);
  });

  it("passes when either side is blank", () => {
    expect(predicate({ start: undefined, end: "2026-08-01" })).toBe(true);
    expect(predicate({ start: "2026-08-01", end: undefined })).toBe(true);
  });
});
