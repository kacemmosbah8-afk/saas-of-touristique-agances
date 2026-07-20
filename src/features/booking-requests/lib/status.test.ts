import { describe, it, expect } from "vitest";

import { canTransition, canConvert, isTerminal } from "@/features/booking-requests/lib/status";

describe("booking request status transitions", () => {
  it("allows the happy-path progression", () => {
    expect(canTransition("PENDING", "CONTACTED")).toBe(true);
    expect(canTransition("CONTACTED", "CONFIRMED")).toBe(true);
  });

  it("allows rejecting or cancelling from pending or contacted", () => {
    expect(canTransition("PENDING", "REJECTED")).toBe(true);
    expect(canTransition("PENDING", "CANCELLED")).toBe(true);
    expect(canTransition("CONTACTED", "REJECTED")).toBe(true);
    expect(canTransition("CONTACTED", "CANCELLED")).toBe(true);
  });

  it("allows pulling a contacted request back to pending", () => {
    expect(canTransition("CONTACTED", "PENDING")).toBe(true);
  });

  it("treats CONFIRMED, REJECTED and CANCELLED as terminal", () => {
    expect(isTerminal("CONFIRMED")).toBe(true);
    expect(isTerminal("REJECTED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(canTransition("CONFIRMED", "PENDING")).toBe(false);
    expect(canTransition("REJECTED", "PENDING")).toBe(false);
    expect(canTransition("CANCELLED", "PENDING")).toBe(false);
  });

  it("treats a no-op transition as allowed", () => {
    expect(canTransition("PENDING", "PENDING")).toBe(true);
  });

  it("only allows conversion from pending or contacted", () => {
    expect(canConvert("PENDING")).toBe(true);
    expect(canConvert("CONTACTED")).toBe(true);
    expect(canConvert("CONFIRMED")).toBe(false);
    expect(canConvert("REJECTED")).toBe(false);
    expect(canConvert("CANCELLED")).toBe(false);
  });
});
