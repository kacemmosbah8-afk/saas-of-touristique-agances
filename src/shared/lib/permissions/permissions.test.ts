import { describe, it, expect } from "vitest";

import { can, CRM_RESOURCES, INVENTORY_RESOURCES } from "@/shared/lib/permissions/permissions";

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

  it("restricts READ_ONLY to view only", () => {
    for (const resource of INVENTORY_RESOURCES) {
      expect(can("READ_ONLY", resource, "view")).toBe(true);
      expect(can("READ_ONLY", resource, "create")).toBe(false);
      expect(can("READ_ONLY", resource, "update")).toBe(false);
      expect(can("READ_ONLY", resource, "delete")).toBe(false);
    }
  });

  it("keeps package permissions intact after the M2 expansion", () => {
    expect(can("AGENT", "package", "create")).toBe(true);
    expect(can("READ_ONLY", "package", "create")).toBe(false);
    expect(can("OWNER", "package", "delete")).toBe(true);
  });
});

describe("RBAC — CRM resources (M3)", () => {
  it("gives editors create/update but not delete on CRM resources", () => {
    for (const resource of CRM_RESOURCES) {
      expect(can("AGENT", resource, "create")).toBe(true);
      expect(can("AGENT", resource, "update")).toBe(true);
      expect(can("AGENT", resource, "delete")).toBe(false);
      expect(can("ADMIN", resource, "delete")).toBe(true);
      expect(can("READ_ONLY", resource, "view")).toBe(true);
      expect(can("READ_ONLY", resource, "create")).toBe(false);
    }
  });

  it("restricts provider management to owners/admins", () => {
    expect(can("OWNER", "provider", "manage")).toBe(true);
    expect(can("ADMIN", "provider", "manage")).toBe(true);
    expect(can("AGENT", "provider", "manage")).toBe(false);
    expect(can("AGENT", "provider", "view")).toBe(true);
    expect(can("READ_ONLY", "provider", "view")).toBe(false);
  });

  it("restricts settings updates to owners/admins", () => {
    expect(can("OWNER", "settings", "update")).toBe(true);
    expect(can("ADMIN", "settings", "update")).toBe(true);
    expect(can("AGENT", "settings", "update")).toBe(false);
    expect(can("AGENT", "settings", "view")).toBe(true);
    expect(can("READ_ONLY", "settings", "view")).toBe(true);
  });
});
