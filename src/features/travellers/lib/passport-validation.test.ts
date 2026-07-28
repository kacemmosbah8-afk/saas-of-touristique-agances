import { describe, expect, it } from "vitest";

import {
  checkPassportExpiry,
  isPassportProblem,
  isPassportWarning,
} from "@/features/travellers/lib/passport-validation";

const now = new Date("2026-07-12T00:00:00Z");
const travelEnd = new Date("2026-09-01T00:00:00Z");

describe("checkPassportExpiry", () => {
  it("reports MISSING when no expiry is on file", () => {
    expect(checkPassportExpiry(null, travelEnd, now)).toBe("MISSING");
  });

  it("reports EXPIRED for a past expiry", () => {
    expect(checkPassportExpiry(new Date("2026-01-01"), travelEnd, now)).toBe("EXPIRED");
  });

  it("reports EXPIRES_BEFORE_TRAVEL when valid today but not through the trip", () => {
    expect(checkPassportExpiry(new Date("2026-08-15"), travelEnd, now)).toBe(
      "EXPIRES_BEFORE_TRAVEL",
    );
  });

  it("reports EXPIRES_WITHIN_SIX_MONTHS against travel end when dated", () => {
    // Outlives the trip but not travel end + 6 months.
    expect(checkPassportExpiry(new Date("2026-11-01"), travelEnd, now)).toBe(
      "EXPIRES_WITHIN_SIX_MONTHS",
    );
  });

  it("reports EXPIRES_WITHIN_SIX_MONTHS against today when no travel dates", () => {
    expect(checkPassportExpiry(new Date("2026-10-01"), null, now)).toBe(
      "EXPIRES_WITHIN_SIX_MONTHS",
    );
  });

  it("reports VALID when the expiry clears the six-month rule", () => {
    expect(checkPassportExpiry(new Date("2027-06-01"), travelEnd, now)).toBe("VALID");
    expect(checkPassportExpiry(new Date("2027-06-01"), null, now)).toBe("VALID");
  });
});

describe("severity buckets", () => {
  it("classifies problems vs warnings vs valid", () => {
    expect(isPassportProblem("EXPIRED")).toBe(true);
    expect(isPassportProblem("EXPIRES_BEFORE_TRAVEL")).toBe(true);
    expect(isPassportProblem("EXPIRES_WITHIN_SIX_MONTHS")).toBe(false);
    expect(isPassportWarning("MISSING")).toBe(true);
    expect(isPassportWarning("EXPIRES_WITHIN_SIX_MONTHS")).toBe(true);
    expect(isPassportWarning("VALID")).toBe(false);
    expect(isPassportProblem("VALID")).toBe(false);
  });
});
