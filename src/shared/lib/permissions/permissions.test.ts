import { describe, it, expect } from "vitest";

import { can, INVENTORY_RESOURCES } from "@/shared/lib/permissions/permissions";

describe("RBAC — inventory resources", () => {
  it("grants OWNER and ADMIN full CRUD on every inventory resource", () => {
    for (const resource of INVENTORY_RESOURCES) {
      for (const action of ["view", "create", "update", "delete", "manage"] as const) {
        expect(can("OWNER", resource, action)).toBe(true);
        expect(can("ADMIN", resource, action)).toBe(true);
      }
    }
  });

  it("lets AGENT create/update but not delete or manage", () => {
    for (const resource of INVENTORY_RESOURCES) {
      expect(can("AGENT", resource, "view")).toBe(true);
      expect(can("AGENT", resource, "create")).toBe(true);
      expect(can("AGENT", resource, "update")).toBe(true);
      expect(can("AGENT", resource, "delete")).toBe(false);
      expect(can("AGENT", resource, "manage")).toBe(false);
    }
  });

  it("restricts ACCOUNTANT and READ_ONLY to view only", () => {
    for (const resource of INVENTORY_RESOURCES) {
      for (const role of ["ACCOUNTANT", "READ_ONLY"] as const) {
        expect(can(role, resource, "view")).toBe(true);
        expect(can(role, resource, "create")).toBe(false);
        expect(can(role, resource, "update")).toBe(false);
        expect(can(role, resource, "delete")).toBe(false);
      }
    }
  });

  it("keeps package permissions intact after the M2 expansion", () => {
    expect(can("AGENT", "package", "create")).toBe(true);
    expect(can("READ_ONLY", "package", "create")).toBe(false);
    expect(can("OWNER", "package", "delete")).toBe(true);
  });
});
