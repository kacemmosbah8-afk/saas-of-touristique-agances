import { redirect } from "next/navigation";

import { prisma } from "@/shared/lib/db";

/**
 * Single-agency licensing (see RootPage, `src/app/(marketing)/page.tsx`) —
 * a visitor typing the bare `/admin` URL (a natural guess; there is only
 * one tenant) should land in that tenant's admin, not hit a 404 for
 * omitting the `/[tenantSlug]` prefix.
 */
export default async function BareAdminPage() {
  const tenant = await prisma.tenant.findFirst({ select: { slug: true } });
  redirect(tenant ? `/${tenant.slug}/admin` : "/sign-in");
}
