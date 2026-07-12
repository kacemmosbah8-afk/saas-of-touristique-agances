import { describe, it, expect } from "vitest";

import { canTransition, nextStatuses, isTerminal } from "@/features/bookings/lib/status";

describe("booking status transitions", () => {
  it("allows the happy-path progression", () => {
    expect(canTransition("DRAFT", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("allows cancelling from any non-terminal state", () => {
    expect(canTransition("DRAFT", "CANCELLED")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
  });

  it("permits pulling a confirmed booking back to draft to re-quote", () => {
    expect(canTransition("CONFIRMED", "DRAFT")).toBe(true);
  });

  it("rejects skipping and illegal jumps", () => {
    expect(canTransition("DRAFT", "IN_PROGRESS")).toBe(false);
    expect(canTransition("DRAFT", "COMPLETED")).toBe(false);
    expect(canTransition("CONFIRMED", "COMPLETED")).toBe(false);
  });

  it("treats COMPLETED and CANCELLED as terminal", () => {
    expect(isTerminal("COMPLETED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(nextStatuses("COMPLETED")).toHaveLength(0);
    expect(nextStatuses("CANCELLED")).toHaveLength(0);
    expect(canTransition("COMPLETED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("CANCELLED", "DRAFT")).toBe(false);
  });

  it("treats a no-op transition as allowed", () => {
    expect(canTransition("COMPLETED", "COMPLETED")).toBe(true);
  });
});
