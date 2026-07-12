import "server-only";
import { PrismaClient } from "@prisma/client";

import { env } from "@/shared/config/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Models that carry a `tenantId` column. Kept as an explicit allowlist
 * (rather than introspected from the DMMF) so adding a new tenant-scoped
 * model to the schema is a deliberate, reviewable change here too.
 */
const TENANT_SCOPED_MODELS = new Set(["Membership", "Invitation", "AuditLog", "Package", "PackageImage"]);

type PrismaArgs = Record<string, unknown>;

function injectTenantScope(
  operation: string,
  args: PrismaArgs,
  tenantId: string,
): PrismaArgs {
  switch (operation) {
    case "findMany":
    case "count":
    case "aggregate":
    case "groupBy":
    case "updateMany":
    case "deleteMany":
      return {
        ...args,
        where: { ...(args.where as object | undefined), tenantId },
      };

    case "create":
      return {
        ...args,
        data: { ...(args.data as object | undefined), tenantId },
      };

    case "createMany":
      return {
        ...args,
        data: Array.isArray(args.data)
          ? args.data.map((d: object) => ({ ...d, tenantId }))
          : args.data,
      };

    default:
      // findUnique / findFirst / update / delete and their *OrThrow variants
      // are intentionally NOT auto-scoped here: a unique `where` (e.g. { id })
      // can't have tenantId safely folded in without knowing the exact key
      // shape. Feature-layer queries MUST pass tenantId explicitly for
      // single-record lookups (e.g. `where: { id, tenantId }` or a compound
      // unique). This is a documented gap — see PROJECT.md "What is a
      // placeholder" — mitigated by Postgres RLS as a second layer.
      return args;
  }
}

/**
 * Returns a Prisma Client scoped to a single tenant. List/aggregate/create
 * operations against tenant-scoped models are automatically filtered by
 * `tenantId` — this is the application-layer half of tenant isolation (the
 * database-layer half is Postgres RLS, see
 * prisma/sql/001_row_level_security.sql).
 *
 * Single-record operations (findUnique, update, delete, ...) are NOT
 * auto-scoped — pass `tenantId` explicitly in those queries. See the
 * `default` branch of injectTenantScope for why.
 *
 * All feature code must read/write through this client, never through the
 * raw `prisma` export, once a request has an active tenant.
 */
export function getTenantDb(tenantId: string) {
  if (!tenantId) {
    throw new Error("getTenantDb() called without a tenantId");
  }

  return prisma.$extends({
    name: "tenant-guard",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          return query(injectTenantScope(operation, args, tenantId));
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof getTenantDb>;
