import { describe, it, expect } from "vitest";

import { can } from "@/shared/lib/permissions/permissions";

describe("quote permissions", () => {
  it("lets owners and admins fully manage quotes", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      expect(can(role, "quote", "view")).toBe(true);
      expect(can(role, "quote", "create")).toBe(true);
      expect(can(role, "quote", "update")).toBe(true);
      expect(can(role, "quote", "delete")).toBe(true);
      expect(can(role, "quote", "manage")).toBe(true);
    }
  });

  it("lets agents draft and send quotes but not delete them", () => {
    expect(can("AGENT", "quote", "view")).toBe(true);
    expect(can("AGENT", "quote", "create")).toBe(true);
    expect(can("AGENT", "quote", "update")).toBe(true);
    expect(can("AGENT", "quote", "delete")).toBe(false);
    expect(can("AGENT", "quote", "manage")).toBe(false);
  });

  it("gives accountants and read-only users view access only", () => {
    for (const role of ["ACCOUNTANT", "READ_ONLY"] as const) {
      expect(can(role, "quote", "view")).toBe(true);
      expect(can(role, "quote", "create")).toBe(false);
      expect(can(role, "quote", "update")).toBe(false);
      expect(can(role, "quote", "delete")).toBe(false);
    }
  });
});
