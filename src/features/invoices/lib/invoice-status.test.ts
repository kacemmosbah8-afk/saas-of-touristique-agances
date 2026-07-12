import { describe, expect, it } from "vitest";

import {
  canTransition,
  canIssue,
  canVoid,
  canEditItems,
  canRecordPayment,
  canIssueCreditNote,
  deriveCollectionStatus,
  isOverdue,
  isTerminal,
} from "@/features/invoices/lib/invoice-status";

describe("invoice lifecycle transitions", () => {
  it("follows the happy path DRAFT → ISSUED → PARTIALLY_PAID → PAID", () => {
    expect(canTransition("DRAFT", "ISSUED")).toBe(true);
    expect(canTransition("ISSUED", "PARTIALLY_PAID")).toBe(true);
    expect(canTransition("PARTIALLY_PAID", "PAID")).toBe(true);
  });

  it("lets refunds reopen a paid invoice", () => {
    expect(canTransition("PAID", "PARTIALLY_PAID")).toBe(true);
    expect(canTransition("PAID", "ISSUED")).toBe(true);
  });

  it("never allows skipping issue or reviving a void", () => {
    expect(canTransition("DRAFT", "PAID")).toBe(false);
    expect(canTransition("DRAFT", "PARTIALLY_PAID")).toBe(false);
    expect(canTransition("VOID", "ISSUED")).toBe(false);
    expect(canTransition("VOID", "DRAFT")).toBe(false);
  });

  it("treats VOID as the only terminal state", () => {
    expect(isTerminal("VOID")).toBe(true);
    expect(isTerminal("PAID")).toBe(false); // refunds can reopen it
    expect(isTerminal("DRAFT")).toBe(false);
  });
});

describe("invoice gates", () => {
  it("only drafts can be issued and edited", () => {
    expect(canIssue("DRAFT")).toBe(true);
    expect(canEditItems("DRAFT")).toBe(true);
    for (const s of ["ISSUED", "PARTIALLY_PAID", "PAID", "VOID"] as const) {
      expect(canIssue(s)).toBe(false);
      expect(canEditItems(s)).toBe(false);
    }
  });

  it("only open invoices accept payments and voiding", () => {
    for (const s of ["ISSUED", "PARTIALLY_PAID"] as const) {
      expect(canRecordPayment(s)).toBe(true);
      expect(canVoid(s)).toBe(true);
    }
    for (const s of ["DRAFT", "PAID", "VOID"] as const) {
      expect(canRecordPayment(s)).toBe(false);
      expect(canVoid(s)).toBe(false);
    }
  });

  it("allows credit notes on open and paid invoices only", () => {
    for (const s of ["ISSUED", "PARTIALLY_PAID", "PAID"] as const) {
      expect(canIssueCreditNote(s)).toBe(true);
    }
    expect(canIssueCreditNote("DRAFT")).toBe(false);
    expect(canIssueCreditNote("VOID")).toBe(false);
  });
});

describe("deriveCollectionStatus", () => {
  it("moves an issued invoice through partial to paid as money arrives", () => {
    expect(deriveCollectionStatus("ISSUED", 1000, 0)).toBe("ISSUED");
    expect(deriveCollectionStatus("ISSUED", 1000, 400)).toBe("PARTIALLY_PAID");
    expect(deriveCollectionStatus("PARTIALLY_PAID", 1000, 1000)).toBe("PAID");
  });

  it("drops a paid invoice back when a refund empties it", () => {
    expect(deriveCollectionStatus("PAID", 1000, 400)).toBe("PARTIALLY_PAID");
    expect(deriveCollectionStatus("PAID", 1000, 0)).toBe("ISSUED");
  });

  it("never restatuses drafts or voids", () => {
    expect(deriveCollectionStatus("DRAFT", 1000, 500)).toBeNull();
    expect(deriveCollectionStatus("VOID", 1000, 500)).toBeNull();
  });

  it("does not mark a fully-credited (zero-owed) invoice paid", () => {
    // amountOwed 0 with no money collected stays ISSUED, not PAID.
    expect(deriveCollectionStatus("ISSUED", 0, 0)).toBe("ISSUED");
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-07-12T12:00:00Z");
  const past = new Date("2026-07-01T00:00:00Z");
  const future = new Date("2026-08-01T00:00:00Z");

  it("flags an open invoice past its due date with a balance", () => {
    expect(isOverdue("ISSUED", past, 100, now)).toBe(true);
    expect(isOverdue("PARTIALLY_PAID", past, 1, now)).toBe(true);
  });

  it("never flags settled, future-due, or non-open invoices", () => {
    expect(isOverdue("ISSUED", past, 0, now)).toBe(false);
    expect(isOverdue("ISSUED", future, 100, now)).toBe(false);
    expect(isOverdue("ISSUED", null, 100, now)).toBe(false);
    expect(isOverdue("PAID", past, 0, now)).toBe(false);
    expect(isOverdue("DRAFT", past, 100, now)).toBe(false);
    expect(isOverdue("VOID", past, 100, now)).toBe(false);
  });
});
