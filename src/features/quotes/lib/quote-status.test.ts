import { describe, expect, it } from "vitest";

import {
  canTransition,
  canEditItems,
  canConvert,
  isTerminal,
  nextStatuses,
} from "@/features/quotes/lib/quote-status";

describe("quote status transitions", () => {
  it("allows the happy path draft → sent → accepted", () => {
    expect(canTransition("DRAFT", "SENT")).toBe(true);
    expect(canTransition("SENT", "ACCEPTED")).toBe(true);
  });

  it("allows a sent quote to be declined or to expire", () => {
    expect(canTransition("SENT", "DECLINED")).toBe(true);
    expect(canTransition("SENT", "EXPIRED")).toBe(true);
  });

  it("lets a sent or expired quote be pulled back to draft to revise", () => {
    expect(canTransition("SENT", "DRAFT")).toBe(true);
    expect(canTransition("EXPIRED", "DRAFT")).toBe(true);
  });

  it("forbids skipping straight from draft to accepted", () => {
    expect(canTransition("DRAFT", "ACCEPTED")).toBe(false);
  });

  it("treats declined and converted as terminal", () => {
    expect(isTerminal("DECLINED")).toBe(true);
    expect(isTerminal("CONVERTED")).toBe(true);
    expect(nextStatuses("CONVERTED")).toHaveLength(0);
  });

  it("allows a no-op transition to the same status", () => {
    expect(canTransition("SENT", "SENT")).toBe(true);
  });
});

describe("canEditItems", () => {
  it("permits editing only while draft or sent", () => {
    expect(canEditItems("DRAFT")).toBe(true);
    expect(canEditItems("SENT")).toBe(true);
    expect(canEditItems("ACCEPTED")).toBe(false);
    expect(canEditItems("CONVERTED")).toBe(false);
    expect(canEditItems("DECLINED")).toBe(false);
  });
});

describe("canConvert", () => {
  it("permits conversion only from the accepted state", () => {
    expect(canConvert("ACCEPTED")).toBe(true);
    expect(canConvert("SENT")).toBe(false);
    expect(canConvert("DRAFT")).toBe(false);
    expect(canConvert("CONVERTED")).toBe(false);
  });
});
