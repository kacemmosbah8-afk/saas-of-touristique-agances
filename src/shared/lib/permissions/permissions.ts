import type { MembershipRole } from "@prisma/client";

/**
 * Resources known to the system as of M0. Business-domain modules
 * (bookings, itineraries, finance, ...) will register their own resources
 * here in the milestone that introduces them — this file is the single
 * source of truth for "what can be permissioned."
 */
export type Resource = "tenant" | "membership" | "invitation" | "package";

export type Action = "view" | "create" | "update" | "delete" | "manage";

type PermissionKey = `${Resource}:${Action}`;

/**
 * Explicit allow-list per role. Deny-by-default: anything not listed here
 * is not permitted. Kept as a flat matrix (not inherited/hierarchical)
 * because implicit inheritance is exactly the kind of thing that grants
 * silent excess access as roles evolve — every grant should be visible on
 * its own line.
 */
const ROLE_PERMISSIONS: Record<MembershipRole, readonly PermissionKey[]> = {
  OWNER: [
    "tenant:view",
    "tenant:update",
    "tenant:manage",
    "tenant:delete",
    "membership:view",
    "membership:create",
    "membership:update",
    "membership:delete",
    "membership:manage",
    "invitation:view",
    "invitation:create",
    "invitation:update",
    "invitation:delete",
    "package:view",
    "package:create",
    "package:update",
    "package:delete",
    "package:manage",
  ],
  ADMIN: [
    "tenant:view",
    "tenant:update",
    "membership:view",
    "membership:create",
    "membership:update",
    "membership:delete",
    "invitation:view",
    "invitation:create",
    "invitation:update",
    "invitation:delete",
    "package:view",
    "package:create",
    "package:update",
    "package:delete",
    "package:manage",
  ],
  AGENT: [
    "tenant:view",
    "membership:view",
    "invitation:view",
    "package:view",
    "package:create",
    "package:update",
  ],
  ACCOUNTANT: ["tenant:view", "membership:view", "invitation:view", "package:view"],
  READ_ONLY: ["tenant:view", "membership:view", "package:view"],
};

/**
 * Pure, synchronous permission check — no I/O. Given a role, can it perform
 * `action` on `resource`?
 */
export function can(
  role: MembershipRole,
  resource: Resource,
  action: Action,
): boolean {
  const key: PermissionKey = `${resource}:${action}`;
  return ROLE_PERMISSIONS[role].includes(key);
}
