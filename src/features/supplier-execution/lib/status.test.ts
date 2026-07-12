import { describe, it, expect } from "vitest";

import { canTransition, isTerminal } from "@/features/supplier-execution/lib/status";

describe("SupplierOrder canTransition", () => {
  it("allows the happy path: PENDING -> EXECUTING -> SUPPLIER_CONFIRMED", () => {
    expect(canTransition("PENDING", "EXECUTING")).toBe(true);
    expect(canTransition("EXECUTING", "SUPPLIER_CONFIRMED")).toBe(true);
  });

  it("allows retry from SUPPLIER_FAILED back to EXECUTING", () => {
    expect(canTransition("SUPPLIER_FAILED", "EXECUTING")).toBe(true);
  });

  it("does not allow retry to skip straight to SUPPLIER_CONFIRMED", () => {
    expect(canTransition("SUPPLIER_FAILED", "SUPPLIER_CONFIRMED")).toBe(false);
  });

  it("never allows a transition out of RECONCILIATION_REQUIRED except manual resolution", () => {
    expect(canTransition("RECONCILIATION_REQUIRED", "EXECUTING")).toBe(false);
    expect(canTransition("RECONCILIATION_REQUIRED", "SUPPLIER_CONFIRMED")).toBe(true);
    expect(canTransition("RECONCILIATION_REQUIRED", "CANCELLED")).toBe(true);
  });

  it("allows cancellation from a confirmed or held order, not from a failed one", () => {
    expect(canTransition("SUPPLIER_CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransition("AWAITING_PAYMENT", "CANCELLED")).toBe(true);
    expect(canTransition("SUPPLIER_FAILED", "CANCELLED")).toBe(false);
  });

  it("treats CANCELLED and a resolved RECONCILIATION_REQUIRED as terminal-consistent", () => {
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("PENDING")).toBe(false);
    expect(isTerminal("RECONCILIATION_REQUIRED")).toBe(false);
  });

  it("a no-op (same state) is always allowed", () => {
    expect(canTransition("EXECUTING", "EXECUTING")).toBe(true);
  });
});
