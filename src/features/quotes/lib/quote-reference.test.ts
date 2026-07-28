import { describe, expect, it } from "vitest";

import {
  formatQuoteReference,
  parseQuoteReferenceSequence,
} from "@/features/quotes/lib/quote-reference";

describe("formatQuoteReference", () => {
  it("zero-pads the sequence to four digits with the QT prefix", () => {
    expect(formatQuoteReference(2026, 1)).toBe("QT-2026-0001");
    expect(formatQuoteReference(2026, 42)).toBe("QT-2026-0042");
  });

  it("does not truncate sequences beyond four digits", () => {
    expect(formatQuoteReference(2026, 12345)).toBe("QT-2026-12345");
  });

  it("clamps a zero/negative sequence to 1", () => {
    expect(formatQuoteReference(2026, 0)).toBe("QT-2026-0001");
  });
});

describe("parseQuoteReferenceSequence", () => {
  it("round-trips a formatted reference", () => {
    expect(parseQuoteReferenceSequence("QT-2026-0042")).toBe(42);
  });

  it("returns null for a non-matching or booking reference", () => {
    expect(parseQuoteReferenceSequence("BK-2026-0001")).toBeNull();
    expect(parseQuoteReferenceSequence("nonsense")).toBeNull();
  });
});
