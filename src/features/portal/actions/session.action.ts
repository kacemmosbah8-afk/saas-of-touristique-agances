"use server";

import { redirect } from "next/navigation";

import { endPortalSession } from "@/features/portal/lib/guard";

export async function portalSignOutAction(tenantSlug: string): Promise<void> {
  await endPortalSession();
  redirect(`/portal/${tenantSlug}/access`);
}
