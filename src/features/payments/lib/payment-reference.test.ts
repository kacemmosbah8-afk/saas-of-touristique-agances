import { describe, expect, it } from "vitest";

import {
  formatPaymentReference,
  parsePaymentReferenceSequence,
} from "@/features/payments/lib/payment-reference";

describe("payment reference", () => {
  it("formats PAY-<year>-<seq> with zero padding", () => {
    expect(formatPaymentReference(2026, 3)).toBe("PAY-2026-0003");
  });

  it("clamps the sequence to at least 1", () => {
    expect(formatPaymentReference(2026, 0)).toBe("PAY-2026-0001");
    expect(formatPaymentReference(2026, -5)).toBe("PAY-2026-0001");
  });

  it("round-trips and rejects foreign prefixes", () => {
    expect(parsePaymentReferenceSequence("PAY-2026-0042")).toBe(42);
    expect(parsePaymentReferenceSequence("INV-2026-0042")).toBeNull();
  });
});
