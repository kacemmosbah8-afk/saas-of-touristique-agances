"use server";

import { prisma } from "@/shared/lib/db";
import { requireSession } from "@/shared/lib/permissions/guard";
import {
  createTenantSchema,
  type CreateTenantInput,
} from "@/features/tenants/schemas/create-tenant.schema";

type CreateTenantResult =
  | { success: false; error: string }
  | { success: true; tenantId: string; slug: string };

/**
 * Creates a Tenant + an OWNER Membership for the current user.
 *
 * Deliberately does NOT refresh the session or redirect here: this action's
 * JWT cookie update and the subsequent tenant-page navigation must be
 * strictly ordered (cookie committed to the browser before middleware sees
 * the next request) or the user gets bounced back to sign-in. That ordering
 * is only reliable via the client-side `useSession().update()` call — see
 * CreateTenantForm — so the caller does the refresh + redirect.
 */
export async function createTenantAction(
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  const session = await requireSession();

  const parsed = createTenantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const existing = await prisma.tenant.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "That workspace URL is already taken." };
  }

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: { name: parsed.data.name, slug: parsed.data.slug },
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

  return { success: true, tenantId: tenant.id, slug: tenant.slug };
}
