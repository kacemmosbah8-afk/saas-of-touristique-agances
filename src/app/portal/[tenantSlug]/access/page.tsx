import { prisma } from "@/shared/lib/db";
import { AccessRequestForm } from "@/features/portal/components/access-request-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export const metadata = { title: "Access your trip" };

export default async function PortalAccessPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const { error } = await searchParams;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { name: true } });

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{tenant?.name ?? "Trip portal"}</CardTitle>
          <CardDescription>
            Enter your booking reference and email — we&apos;ll send you a secure link to view your trip.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === "invalid_link" && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              That link has expired or was already used. Request a new one below.
            </p>
          )}
          <AccessRequestForm tenantSlug={tenantSlug} />
          <p className="text-muted-foreground text-center text-xs">
            Your booking reference is on your confirmation email — usually starts with &ldquo;BK-&rdquo;.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
