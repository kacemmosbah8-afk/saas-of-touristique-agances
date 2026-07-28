import { redirect } from "next/navigation";

import { prisma } from "@/shared/lib/db";

/**
 * This deployment is licensed to a single agency (see PROJECT.md,
 * "Single-agency licensing") — there is no prospective-customer audience
 * left to pitch TravelOS-the-product to, so a visitor landing on the bare
 * domain must see that agency's own storefront, not the old multi-tenant
 * SaaS marketing page this route used to render. Redirects to the
 * bootstrapped tenant's public homepage; the sibling `/about`, `/features`,
 * `/solutions` marketing pages are separately flagged for removal — the
 * root is the one path a real visitor is guaranteed to hit first.
 */
export default async function RootPage() {
  const tenant = await prisma.tenant.findFirst({ select: { slug: true } });
  redirect(tenant ? `/${tenant.slug}` : "/sign-in");
}
