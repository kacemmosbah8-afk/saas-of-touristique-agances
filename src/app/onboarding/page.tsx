import { redirect } from "next/navigation";

import { requireSession } from "@/shared/lib/permissions/guard";
import { CreateTenantForm } from "@/features/tenants/components/create-tenant-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Logo } from "@/shared/components/brand/logo";

export const metadata = {
  title: "Create your workspace — TravelOS",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const session = await requireSession();

  if (session.memberships.length > 0) {
    redirect(`/${session.memberships[0].tenantSlug}`);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Logo size={26} className="mb-2" />
          <CardTitle className="font-serif text-xl">Create your workspace</CardTitle>
          <CardDescription>
            Set up the agency workspace your team will work in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTenantForm />
        </CardContent>
      </Card>
    </div>
  );
}
