import { describe, it, expect } from "vitest";

import { can } from "@/shared/lib/permissions/permissions";

describe("finance permissions", () => {
  it("lets owners and admins fully manage invoices and payments", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      for (const resource of ["invoice", "payment"] as const) {
        expect(can(role, resource, "view")).toBe(true);
        expect(can(role, resource, "create")).toBe(true);
        expect(can(role, resource, "update")).toBe(true);
        expect(can(role, resource, "delete")).toBe(true);
        expect(can(role, resource, "manage")).toBe(true);
      }
    }
  });

  it("lets accountants run collections (incl. void/refund) but never delete", () => {
    for (const resource of ["invoice", "payment"] as const) {
      expect(can("ACCOUNTANT", resource, "view")).toBe(true);
      expect(can("ACCOUNTANT", resource, "create")).toBe(true);
      expect(can("ACCOUNTANT", resource, "update")).toBe(true);
      expect(can("ACCOUNTANT", resource, "manage")).toBe(true);
      expect(can("ACCOUNTANT", resource, "delete")).toBe(false);
    }
  });

  it("lets agents draft invoices and record payments but not void or refund", () => {
    for (const resource of ["invoice", "payment"] as const) {
      expect(can("AGENT", resource, "view")).toBe(true);
      expect(can("AGENT", resource, "create")).toBe(true);
      expect(can("AGENT", resource, "update")).toBe(true);
      expect(can("AGENT", resource, "manage")).toBe(false);
      expect(can("AGENT", resource, "delete")).toBe(false);
    }
  });

  it("keeps read-only users to view access", () => {
    for (const resource of ["invoice", "payment"] as const) {
      expect(can("READ_ONLY", resource, "view")).toBe(true);
      expect(can("READ_ONLY", resource, "create")).toBe(false);
      expect(can("READ_ONLY", resource, "update")).toBe(false);
      expect(can("READ_ONLY", resource, "manage")).toBe(false);
      expect(can("READ_ONLY", resource, "delete")).toBe(false);
    }
  });
});
