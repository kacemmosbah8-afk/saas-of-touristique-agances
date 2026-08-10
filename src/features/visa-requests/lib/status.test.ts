import { describe, it, expect } from "vitest";

import { canTransition, isTerminal } from "@/features/visa-requests/lib/status";

describe("visa request status transitions", () => {
  it("allows the happy-path progression", () => {
    expect(canTransition("PENDING", "CONTACTED")).toBe(true);
    expect(canTransition("CONTACTED", "DOCUMENTS_REQUESTED")).toBe(true);
    expect(canTransition("DOCUMENTS_REQUESTED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "APPROVED")).toBe(true);
  });

  it("allows rejecting or cancelling from any non-terminal status", () => {
    expect(canTransition("PENDING", "REJECTED")).toBe(true);
    expect(canTransition("CONTACTED", "CANCELLED")).toBe(true);
    expect(canTransition("DOCUMENTS_REQUESTED", "REJECTED")).toBe(true);
    expect(canTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
  });

  it("allows pulling a contacted/documents-requested request back", () => {
    expect(canTransition("CONTACTED", "PENDING")).toBe(true);
    expect(canTransition("DOCUMENTS_REQUESTED", "CONTACTED")).toBe(true);
  });

  it("does not allow skipping backwards from IN_PROGRESS", () => {
    expect(canTransition("IN_PROGRESS", "PENDING")).toBe(false);
    expect(canTransition("IN_PROGRESS", "CONTACTED")).toBe(false);
  });

  it("treats APPROVED, REJECTED and CANCELLED as terminal", () => {
    expect(isTerminal("APPROVED")).toBe(true);
    expect(isTerminal("REJECTED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(canTransition("APPROVED", "PENDING")).toBe(false);
    expect(canTransition("REJECTED", "PENDING")).toBe(false);
    expect(canTransition("CANCELLED", "PENDING")).toBe(false);
  });

  it("treats a no-op transition as allowed", () => {
    expect(canTransition("PENDING", "PENDING")).toBe(true);
  });
});
