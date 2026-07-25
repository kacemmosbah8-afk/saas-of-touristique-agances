import { redirect } from "next/navigation";

import { requireSession } from "@/shared/lib/permissions/guard";
import { siteConfig } from "@/features/marketing/lib/site-config";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Logo } from "@/shared/components/brand/logo";

export const metadata = {
  title: "Account setup",
  robots: { index: false, follow: false },
};

/**
 * Post-sign-in landing point: routes a member straight to the one agency
 * workspace this deployment is licensed to (see PROJECT.md, single-agency
 * licensing). There is no self-serve "create a workspace" path here — a
 * signed-in account with no membership yet is a setup gap (the invite
 * flow, `/invite/[token]`, is the only way to join), not a case for
 * spinning one up on the spot.
 */
export default async function OnboardingPage() {
  const session = await requireSession();

  if (session.memberships.length > 0) {
    redirect(`/${session.memberships[0].tenantSlug}/admin`);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Logo size={26} className="mb-2" />
          <CardTitle className="font-serif text-xl">No access yet</CardTitle>
          <CardDescription>
            Your account isn&apos;t linked to {siteConfig.name} yet. Contact an administrator at{" "}
            {siteConfig.supportEmail} to request an invitation.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
