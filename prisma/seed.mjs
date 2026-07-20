#!/usr/bin/env node
/**
 * Bootstrap the first sign-in-ready account.
 *
 * This deployment is licensed to a single agency (see PROJECT.md, "Single-
 * agency licensing") — there is no public self-serve signup, and
 * `createTenantAction` refuses to create a tenant once one exists. On a
 * completely fresh database there is otherwise no way to create the first
 * user at all: `/sign-up` redirects to `/sign-in`, and `/invite/[token]`
 * requires an existing admin to issue a token. This script is that
 * bootstrap step, meant to run once per deployment.
 *
 * Usage: npx prisma db seed  (or: node prisma/seed.mjs)
 *
 * Idempotent: safe to re-run — it upserts the owner user/tenant/membership
 * rather than erroring on a second run, and creates nothing else.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@travelos.local";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "change-this-password";
const OWNER_NAME = process.env.SEED_OWNER_NAME ?? "Agency Owner";
const TENANT_SLUG = process.env.SEED_TENANT_SLUG ?? "one-one-tourisme";
const TENANT_NAME = process.env.SEED_TENANT_NAME ?? "ONE ONE TOURISME";

const prisma = new PrismaClient();

async function main() {
  const existingTenantCount = await prisma.tenant.count();
  if (existingTenantCount > 0) {
    console.log("A tenant already exists — this deployment is already set up. Nothing to do.");
    return;
  }

  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: { name: OWNER_NAME, email: OWNER_EMAIL, passwordHash },
  });

  const tenant = await prisma.tenant.create({
    data: { name: TENANT_NAME, slug: TENANT_SLUG },
  });

  await prisma.membership.create({
    data: { tenantId: tenant.id, userId: user.id, role: "OWNER", status: "ACTIVE" },
  });

  console.log("Owner account ready:");
  console.log(`  Sign in at /sign-in with ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log(`  Workspace: /${TENANT_SLUG}`);
  console.log("  Change the password after first sign-in (Settings → Account).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
