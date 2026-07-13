import { describe, it, expect } from "vitest";

import { planReconciliation } from "@/features/supplier-execution/lib/reconciliation-plan";

describe("planReconciliation", () => {
  it("plans a confirm when an ON REQUEST order resolves to SUPPLIER_CONFIRMED", () => {
    const plan = planReconciliation("AWAITING_SUPPLIER_CONFIRMATION", {
      ok: true,
      status: "SUPPLIER_CONFIRMED",
    });
    expect(plan).toEqual({ action: "confirm" });
  });

  it("plans a cancel when an ON REQUEST order resolves to CANCELLED", () => {
    const plan = planReconciliation("AWAITING_SUPPLIER_CONFIRMATION", {
      ok: true,
      status: "CANCELLED",
    });
    expect(plan).toEqual({ action: "cancel" });
  });

  it("plans still_awaiting on repeated polling with no change, every time", () => {
    const check = { ok: true, status: "AWAITING_SUPPLIER_CONFIRMATION" } as const;
    expect(planReconciliation("AWAITING_SUPPLIER_CONFIRMATION", check)).toEqual({
      action: "still_awaiting",
    });
    // Calling again with the identical inputs (a second poll cycle) produces
    // the identical plan — no hidden state, no drift across repeated calls.
    expect(planReconciliation("AWAITING_SUPPLIER_CONFIRMATION", check)).toEqual({
      action: "still_awaiting",
    });
  });

  it("is idempotent: an already-resolved order is never re-processed, even if the supplier is asked again", () => {
    expect(
      planReconciliation("SUPPLIER_CONFIRMED", { ok: true, status: "SUPPLIER_CONFIRMED" }),
    ).toEqual({ action: "not_applicable" });
    expect(planReconciliation("CANCELLED", { ok: true, status: "CANCELLED" })).toEqual({
      action: "not_applicable",
    });
  });

  it("is a no-op for an order that was never AWAITING (immediate confirmation never reconciles)", () => {
    expect(
      planReconciliation("SUPPLIER_CONFIRMED", { ok: true, status: "AWAITING_SUPPLIER_CONFIRMATION" }),
    ).toEqual({ action: "not_applicable" });
  });

  it("plans check_failed with the classified retryability on a supplier API failure", () => {
    expect(
      planReconciliation("AWAITING_SUPPLIER_CONFIRMATION", {
        ok: false,
        retryable: true,
        message: "Could not reach Hotelbeds.",
      }),
    ).toEqual({ action: "check_failed", retryable: true, message: "Could not reach Hotelbeds." });

    expect(
      planReconciliation("AWAITING_SUPPLIER_CONFIRMATION", {
        ok: false,
        retryable: false,
        message: "Hotelbeds rejected the credentials.",
      }),
    ).toEqual({
      action: "check_failed",
      retryable: false,
      message: "Hotelbeds rejected the credentials.",
    });
  });

  it("never re-processes a status check that arrives after the order left AWAITING by another path", () => {
    // e.g. a staff member cancelled the order manually while a reconciliation
    // job was in flight — the job's own late-arriving check must not revive
    // or re-confirm it.
    expect(
      planReconciliation("CANCELLED", { ok: true, status: "SUPPLIER_CONFIRMED" }),
    ).toEqual({ action: "not_applicable" });
  });
});
