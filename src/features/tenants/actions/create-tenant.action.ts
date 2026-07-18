"use server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/shared/lib/db";
import { requireSession } from "@/shared/lib/permissions/guard";
import { logger } from "@/shared/lib/logger";
import {
  createTenantSchema,
  type CreateTenantInput,
} from "@/features/tenants/schemas/create-tenant.schema";
import type { ActionResult } from "@/shared/types/action-result";

type CreateTenantData = { tenantId: string; slug: string };

export async function createTenantAction(
  input: CreateTenantInput,
): Promise<ActionResult<CreateTenantData>> {
  const session = await requireSession();

  const parsed = createTenantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // This deployment is licensed to a single agency — there is no public
  // self-serve signup (see PROJECT.md §35). Once the one tenant exists,
  // creating another is refused outright rather than silently allowed;
  // new team members join the existing tenant via invitation, not by
  // spinning up a workspace of their own.
  const existingTenantCount = await prisma.tenant.count();
  if (existingTenantCount > 0) {
    return {
      ok: false,
      error: "This TravelOS workspace is already set up. Ask an admin to invite you instead of creating a new one.",
    };
  }

  let tenant: { id: string; slug: string };

  try {
    tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: { name: parsed.data.name, slug: parsed.data.slug },
        select: { id: true, slug: true },
      });
      await tx.membership.create({
        data: {
          tenantId: created.id,
          userId: session.user.id,
          role: "OWNER",
        },
      });

      return created;
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "That workspace URL is already taken." };
    }
    logger.error("create-tenant failed", { userId: session.user.id, error: String(err) });
    throw err;
  }

  logger.info("tenant created", { tenantId: tenant.id, slug: tenant.slug, userId: session.user.id });

  // Deliberate: no session refresh here. Authorization for the new tenant
  // route is DB-backed (requireTenantMembership hits the DB on every request),
  // not reliant on the JWT cache. The client can navigate directly.
  return { ok: true, data: { tenantId: tenant.id, slug: tenant.slug } };
}
