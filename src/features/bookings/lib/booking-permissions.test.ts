import { describe, it, expect } from "vitest";

import { can } from "@/shared/lib/permissions/permissions";

describe("booking permissions", () => {
  it("lets owners and admins fully manage bookings", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      expect(can(role, "booking", "view")).toBe(true);
      expect(can(role, "booking", "create")).toBe(true);
      expect(can(role, "booking", "update")).toBe(true);
      expect(can(role, "booking", "delete")).toBe(true);
      expect(can(role, "booking", "manage")).toBe(true);
    }
  });

  it("lets agents create and update but not delete bookings", () => {
    expect(can("AGENT", "booking", "view")).toBe(true);
    expect(can("AGENT", "booking", "create")).toBe(true);
    expect(can("AGENT", "booking", "update")).toBe(true);
    expect(can("AGENT", "booking", "delete")).toBe(false);
    expect(can("AGENT", "booking", "manage")).toBe(false);
  });

  it("gives accountants and read-only users view access only", () => {
    for (const role of ["ACCOUNTANT", "READ_ONLY"] as const) {
      expect(can(role, "booking", "view")).toBe(true);
      expect(can(role, "booking", "create")).toBe(false);
      expect(can(role, "booking", "update")).toBe(false);
      expect(can(role, "booking", "delete")).toBe(false);
    }
  });
});
