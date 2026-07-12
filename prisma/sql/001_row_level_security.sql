-- Row-Level Security — defense-in-depth for multi-tenancy.
--
-- This is the database-layer half of tenant isolation described in
-- PROJECT.md. The application-layer half (Prisma Client Extension) lives in
-- src/shared/lib/db.ts. Neither layer alone is trusted; both must hold.
--
-- NOT YET WIRED IN — DO NOT APPLY TO A LIVE DATABASE YET. `getTenantDb()` in
-- src/shared/lib/db.ts does not currently run `SET LOCAL
-- app.current_tenant_id` before queries. If this file is applied as-is,
-- `current_setting('app.current_tenant_id', true)` evaluates to NULL on
-- every connection, `"tenantId" = NULL` is never true, and every
-- tenant-scoped query silently returns zero rows — this was confirmed
-- against a live Postgres 16 instance while building M0 (see PROJECT.md,
-- "What is a placeholder"). Do not enable these policies until
-- `getTenantDb()` sets that session variable inside the same transaction as
-- its queries.
--
-- This file is not run by `prisma migrate dev` — Prisma Migrate does not
-- manage RLS policies. Apply it manually (after wiring SET LOCAL) or fold it
-- into a `prisma migrate dev --create-only` migration once the first
-- business table needs it.

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Prisma keeps model fields camelCase at the column level (only table names
-- are snake_cased via @@map) unless a field also has an explicit @map, so
-- these policies must quote "tenantId" rather than reference tenant_id.
CREATE POLICY tenant_isolation_memberships ON memberships
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_invitations ON invitations
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- `tenants` is deliberately NOT RLS-enabled: it has no tenantId column (it
-- IS the tenant), and enabling RLS on it with no policy would deny all
-- reads outright. Access to it is governed by Membership checks in the
-- application layer.
