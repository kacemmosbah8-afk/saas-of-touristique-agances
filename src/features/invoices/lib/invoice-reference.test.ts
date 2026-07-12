import { describe, expect, it } from "vitest";

import {
  formatInvoiceReference,
  parseInvoiceReferenceSequence,
  formatCreditNoteReference,
  parseCreditNoteReferenceSequence,
} from "@/features/invoices/lib/invoice-reference";

describe("invoice reference", () => {
  it("formats INV-<year>-<seq> with zero padding", () => {
    expect(formatInvoiceReference(2026, 1)).toBe("INV-2026-0001");
    expect(formatInvoiceReference(2026, 12345)).toBe("INV-2026-12345");
  });

  it("round-trips through the parser", () => {
    expect(parseInvoiceReferenceSequence(formatInvoiceReference(2026, 42))).toBe(42);
  });

  it("rejects references with the wrong prefix", () => {
    expect(parseInvoiceReferenceSequence("BK-2026-0001")).toBeNull();
    expect(parseInvoiceReferenceSequence("CN-2026-0001")).toBeNull();
    expect(parseInvoiceReferenceSequence("garbage")).toBeNull();
  });
});

describe("credit note reference", () => {
  it("formats CN-<year>-<seq> independently of invoices", () => {
    expect(formatCreditNoteReference(2026, 7)).toBe("CN-2026-0007");
  });

  it("round-trips and rejects foreign prefixes", () => {
    expect(parseCreditNoteReferenceSequence("CN-2026-0007")).toBe(7);
    expect(parseCreditNoteReferenceSequence("INV-2026-0007")).toBeNull();
  });
});
