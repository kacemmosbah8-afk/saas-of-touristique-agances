import { describe, it, expect } from "vitest";

import {
  formatBookingReference,
  parseBookingReferenceSequence,
} from "@/features/bookings/lib/reference";

describe("booking reference", () => {
  it("zero-pads the sequence to four digits", () => {
    expect(formatBookingReference(2026, 1)).toBe("BK-2026-0001");
    expect(formatBookingReference(2026, 42)).toBe("BK-2026-0042");
  });

  it("does not truncate sequences beyond four digits", () => {
    expect(formatBookingReference(2026, 12345)).toBe("BK-2026-12345");
  });

  it("floors the sequence at 1", () => {
    expect(formatBookingReference(2026, 0)).toBe("BK-2026-0001");
  });

  it("round-trips the sequence back out", () => {
    expect(parseBookingReferenceSequence("BK-2026-0007")).toBe(7);
    expect(parseBookingReferenceSequence("BK-2026-12345")).toBe(12345);
  });

  it("returns null for malformed references", () => {
    expect(parseBookingReferenceSequence("INV-2026-0001")).toBeNull();
    expect(parseBookingReferenceSequence("nonsense")).toBeNull();
  });
});
