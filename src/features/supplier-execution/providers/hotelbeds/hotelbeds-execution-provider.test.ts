import { describe, it, expect } from "vitest";

import {
  ageFromDob,
  toExecutionStatus,
  toReconciledStatus,
} from "@/features/supplier-execution/providers/hotelbeds/hotelbeds-execution-provider";

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("ageFromDob", () => {
  it("returns null for a null date of birth", () => {
    expect(ageFromDob(null)).toBeNull();
  });

  it("returns null for an unparsable date", () => {
    expect(ageFromDob("not-a-date")).toBeNull();
  });

  it("computes age when this year's birthday has already passed", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 10);
    dob.setDate(dob.getDate() - 1);
    expect(ageFromDob(fmt(dob))).toBe(10);
  });

  it("computes age when this year's birthday hasn't happened yet", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 10);
    dob.setDate(dob.getDate() + 1);
    expect(ageFromDob(fmt(dob))).toBe(9);
  });
});

describe("toExecutionStatus", () => {
  it("maps PENDING to AWAITING_SUPPLIER_CONFIRMATION", () => {
    expect(toExecutionStatus("PENDING")).toBe("AWAITING_SUPPLIER_CONFIRMATION");
  });

  it("maps CONFIRMED and GUARANTEED to SUPPLIER_CONFIRMED", () => {
    expect(toExecutionStatus("CONFIRMED")).toBe("SUPPLIER_CONFIRMED");
    expect(toExecutionStatus("GUARANTEED")).toBe("SUPPLIER_CONFIRMED");
  });

  it("treats an unrecognized status as confirmed rather than dropping a referenced order", () => {
    expect(toExecutionStatus("UNKNOWN")).toBe("SUPPLIER_CONFIRMED");
    expect(toExecutionStatus("CANCELLED")).toBe("SUPPLIER_CONFIRMED");
  });
});

describe("toReconciledStatus", () => {
  it("maps CONFIRMED and GUARANTEED to SUPPLIER_CONFIRMED", () => {
    expect(toReconciledStatus("CONFIRMED")).toBe("SUPPLIER_CONFIRMED");
    expect(toReconciledStatus("GUARANTEED")).toBe("SUPPLIER_CONFIRMED");
  });

  it("maps CANCELLED to CANCELLED", () => {
    expect(toReconciledStatus("CANCELLED")).toBe("CANCELLED");
  });

  it("maps PENDING to AWAITING_SUPPLIER_CONFIRMATION (still on request)", () => {
    expect(toReconciledStatus("PENDING")).toBe("AWAITING_SUPPLIER_CONFIRMATION");
  });

  it("leaves an unrecognized status AWAITING rather than guessing confirmed or cancelled", () => {
    expect(toReconciledStatus("UNKNOWN")).toBe("AWAITING_SUPPLIER_CONFIRMATION");
  });
});
