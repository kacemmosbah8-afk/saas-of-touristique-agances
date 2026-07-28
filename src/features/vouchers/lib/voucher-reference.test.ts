import { describe, expect, it } from "vitest";

import {
  buildVoucherQrData,
  formatVoucherReference,
  parseVoucherReferenceSequence,
} from "@/features/vouchers/lib/voucher-reference";

describe("voucher reference", () => {
  it("formats VCH-<year>-<seq> with zero padding", () => {
    expect(formatVoucherReference(2026, 9)).toBe("VCH-2026-0009");
  });

  it("round-trips and rejects foreign prefixes", () => {
    expect(parseVoucherReferenceSequence("VCH-2026-0031")).toBe(31);
    expect(parseVoucherReferenceSequence("BK-2026-0031")).toBeNull();
  });
});

describe("buildVoucherQrData", () => {
  it("encodes a stable versioned payload", () => {
    expect(
      buildVoucherQrData({
        voucherReference: "VCH-2026-0001",
        bookingReference: "BK-2026-0042",
        confirmationNumber: "HTL-991",
      }),
    ).toBe("TRAVELOS|V1|VCH-2026-0001|BK-2026-0042|HTL-991");
  });

  it("omits the confirmation segment when absent", () => {
    expect(
      buildVoucherQrData({
        voucherReference: "VCH-2026-0001",
        bookingReference: "BK-2026-0042",
      }),
    ).toBe("TRAVELOS|V1|VCH-2026-0001|BK-2026-0042");
  });
});
