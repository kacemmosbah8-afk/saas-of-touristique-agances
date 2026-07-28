import { redirect } from "next/navigation";

import { resolvePortalSession } from "@/features/portal/lib/guard";

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function PortalRootPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const session = await resolvePortalSession(tenantSlug);
  redirect(`/portal/${tenantSlug}/${session ? "dashboard" : "access"}`);
}
