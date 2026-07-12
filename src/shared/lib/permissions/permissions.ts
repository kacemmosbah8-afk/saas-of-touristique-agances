import type { MembershipRole } from "@prisma/client";

/**
 * Resources known to the system. Business-domain modules register their own
 * resources here in the milestone that introduces them — this file is the
 * single source of truth for "what can be permissioned."
 *
 * M2 adds the Suppliers & Inventory resources. They share the Package
 * permission shape (editors can create/update, managers can archive/manage,
 * admins/owners can delete) so their grants are expanded from a shared list
 * rather than spelled out line-by-line for all five actions × five roles.
 */
export const INVENTORY_RESOURCES = [
  "hotel",
  "transport",
  "guide",
  "supplier",
  "activity",
  "destination",
] as const;

/**
 * M3 CRM/business resources. They share the same role shape as inventory
 * (editors create/update, managers/admins delete + manage). M4 adds
 * `booking`, which follows the same shape (agents book, managers/admins
 * archive) so it joins this list rather than defining a bespoke grant.
 */
export const CRM_RESOURCES = ["customer", "company", "lead", "document", "booking"] as const;

type ScopedResource =
  | (typeof INVENTORY_RESOURCES)[number]
  | (typeof CRM_RESOURCES)[number];

export type Resource =
  | "tenant"
  | "membership"
  | "invitation"
  | "package"
  | ScopedResource
  // Integration + settings: administrative resources with bespoke grants.
  | "provider"
  | "settings";

export type Action = "view" | "create" | "update" | "delete" | "manage";

type PermissionKey = `${Resource}:${Action}`;

/** Expand `resources × actions` into a flat list of permission keys. */
function grant(
  resources: readonly ScopedResource[],
  actions: readonly Action[],
): PermissionKey[] {
  return resources.flatMap((r) => actions.map((a): PermissionKey => `${r}:${a}`));
}

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
    ...grant(INVENTORY_RESOURCES, ["view", "create", "update", "delete", "manage"]),
    ...grant(CRM_RESOURCES, ["view", "create", "update", "delete", "manage"]),
    "provider:view",
    "provider:create",
    "provider:update",
    "provider:delete",
    "provider:manage",
    "settings:view",
    "settings:update",
    "settings:manage",
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
    ...grant(INVENTORY_RESOURCES, ["view", "create", "update", "delete", "manage"]),
    ...grant(CRM_RESOURCES, ["view", "create", "update", "delete", "manage"]),
    "provider:view",
    "provider:create",
    "provider:update",
    "provider:delete",
    "provider:manage",
    "settings:view",
    "settings:update",
    "settings:manage",
  ],
  AGENT: [
    "tenant:view",
    "membership:view",
    "invitation:view",
    "package:view",
    "package:create",
    "package:update",
    ...grant(INVENTORY_RESOURCES, ["view", "create", "update"]),
    ...grant(CRM_RESOURCES, ["view", "create", "update"]),
    "provider:view",
    "settings:view",
  ],
  ACCOUNTANT: [
    "tenant:view",
    "membership:view",
    "invitation:view",
    "package:view",
    ...grant(INVENTORY_RESOURCES, ["view"]),
    ...grant(CRM_RESOURCES, ["view"]),
    "settings:view",
  ],
  READ_ONLY: [
    "tenant:view",
    "membership:view",
    "package:view",
    ...grant(INVENTORY_RESOURCES, ["view"]),
    ...grant(CRM_RESOURCES, ["view"]),
    "settings:view",
  ],
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
