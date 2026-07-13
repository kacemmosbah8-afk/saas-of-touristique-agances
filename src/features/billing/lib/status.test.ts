import { describe, it, expect } from "vitest";

import {
  canTransition,
  isTerminal,
  isTrialExpired,
  isGracePeriodExpired,
  effectiveStatus,
  grantsAccess,
  tenantStatusFor,
  tenantPlanFor,
  trialEndsAtFrom,
  periodEndFor,
  TRIAL_LENGTH_DAYS,
} from "@/features/billing/lib/status";

describe("Subscription canTransition", () => {
  it("allows the trial-to-active happy path", () => {
    expect(canTransition("TRIALING", "ACTIVE")).toBe(true);
  });

  it("allows a lapsed trial to convert later", () => {
    expect(canTransition("EXPIRED", "ACTIVE")).toBe(true);
  });

  it("does not allow skipping suspension straight from active", () => {
    expect(canTransition("ACTIVE", "SUSPENDED")).toBe(false);
  });

  it("allows the full past-due -> suspended -> cancelled chain", () => {
    expect(canTransition("ACTIVE", "PAST_DUE")).toBe(true);
    expect(canTransition("PAST_DUE", "SUSPENDED")).toBe(true);
    expect(canTransition("SUSPENDED", "CANCELLED")).toBe(true);
  });

  it("treats CANCELLED as terminal", () => {
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(canTransition("CANCELLED", "ACTIVE")).toBe(false);
  });
});

describe("isTrialExpired / isGracePeriodExpired", () => {
  it("is false with no end date set", () => {
    expect(isTrialExpired(null)).toBe(false);
    expect(isGracePeriodExpired(null)).toBe(false);
  });

  it("flips exactly at the boundary instant, not after", () => {
    const end = new Date("2026-08-01T00:00:00Z");
    expect(isTrialExpired(end, new Date("2026-07-31T23:59:59Z"))).toBe(false);
    expect(isTrialExpired(end, end)).toBe(true);
  });
});

describe("effectiveStatus", () => {
  it("derives EXPIRED from a lapsed trial even though status is still TRIALING", () => {
    const status = effectiveStatus({
      status: "TRIALING",
      trialEndsAt: new Date("2026-01-01T00:00:00Z"),
      gracePeriodEndsAt: null,
    });
    expect(status).toBe("EXPIRED");
  });

  it("derives SUSPENDED from a lapsed grace period even though status is still PAST_DUE", () => {
    const status = effectiveStatus({
      status: "PAST_DUE",
      trialEndsAt: null,
      gracePeriodEndsAt: new Date("2026-01-01T00:00:00Z"),
    });
    expect(status).toBe("SUSPENDED");
  });

  it("passes through ACTIVE/CANCELLED unchanged", () => {
    expect(effectiveStatus({ status: "ACTIVE", trialEndsAt: null, gracePeriodEndsAt: null })).toBe("ACTIVE");
    expect(effectiveStatus({ status: "CANCELLED", trialEndsAt: null, gracePeriodEndsAt: null })).toBe(
      "CANCELLED",
    );
  });

  it("does not expire a trial whose end date is in the future", () => {
    const future = new Date(Date.now() + 86_400_000);
    const status = effectiveStatus({ status: "TRIALING", trialEndsAt: future, gracePeriodEndsAt: null });
    expect(status).toBe("TRIALING");
  });
});

describe("grantsAccess", () => {
  it("grants access during trial, active, and past-due", () => {
    expect(grantsAccess("TRIALING")).toBe(true);
    expect(grantsAccess("ACTIVE")).toBe(true);
    expect(grantsAccess("PAST_DUE")).toBe(true);
  });

  it("denies access once suspended, cancelled, or expired", () => {
    expect(grantsAccess("SUSPENDED")).toBe(false);
    expect(grantsAccess("CANCELLED")).toBe(false);
    expect(grantsAccess("EXPIRED")).toBe(false);
  });
});

describe("tenantStatusFor", () => {
  it("maps every access-granting status to Tenant ACTIVE", () => {
    expect(tenantStatusFor("TRIALING")).toBe("ACTIVE");
    expect(tenantStatusFor("ACTIVE")).toBe("ACTIVE");
    expect(tenantStatusFor("PAST_DUE")).toBe("ACTIVE");
  });

  it("maps SUSPENDED to Tenant SUSPENDED", () => {
    expect(tenantStatusFor("SUSPENDED")).toBe("SUSPENDED");
  });

  it("maps CANCELLED and EXPIRED to Tenant CANCELLED", () => {
    expect(tenantStatusFor("CANCELLED")).toBe("CANCELLED");
    expect(tenantStatusFor("EXPIRED")).toBe("CANCELLED");
  });
});

describe("tenantPlanFor", () => {
  it("maps every known plan code", () => {
    expect(tenantPlanFor("trial")).toBe("TRIAL");
    expect(tenantPlanFor("starter")).toBe("STARTER");
    expect(tenantPlanFor("professional")).toBe("PROFESSIONAL");
    expect(tenantPlanFor("enterprise")).toBe("ENTERPRISE");
  });

  it("throws on an unrecognized code rather than defaulting", () => {
    expect(() => tenantPlanFor("bogus")).toThrow();
  });
});

describe("trialEndsAtFrom", () => {
  it(`is exactly ${TRIAL_LENGTH_DAYS} days after the start date`, () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const end = trialEndsAtFrom(start);
    expect(end.getTime() - start.getTime()).toBe(TRIAL_LENGTH_DAYS * 86_400_000);
  });
});

describe("periodEndFor", () => {
  it("returns null for no interval (trial plans)", () => {
    expect(periodEndFor(null)).toBeNull();
  });

  it("adds one month for MONTH", () => {
    const start = new Date("2026-01-15T00:00:00Z");
    const end = periodEndFor("MONTH", start);
    expect(end?.toISOString()).toBe("2026-02-15T00:00:00.000Z");
  });

  it("adds one year for YEAR", () => {
    const start = new Date("2026-01-15T00:00:00Z");
    const end = periodEndFor("YEAR", start);
    expect(end?.toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });
});
