import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/shared/lib/db";
import { resolvePortalSession } from "@/features/portal/lib/guard";
import { PortalHeader } from "@/features/portal/components/portal-header";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
};

export default async function PortalLayout({ children, params }: LayoutProps) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true, name: true } });
  if (!tenant) notFound();

  // Optional here — the access/verify pages render without a session. Pages
  // that need one enforce that themselves via `requirePortalSession`.
  const session = await resolvePortalSession(tenantSlug);
  const customerFirstName = session
    ? (
        await prisma.customer.findUnique({
          where: { id: session.customerId },
          select: { firstName: true },
        })
      )?.firstName
    : undefined;

  return (
    <div className="bg-muted/30 flex min-h-full flex-col">
      {session && (
        <PortalHeader tenantSlug={tenantSlug} tenantName={tenant.name} customerFirstName={customerFirstName} />
      )}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="text-muted-foreground print:hidden space-y-1.5 py-6 text-center text-xs">
        <p>Secured trip portal — {tenant.name}</p>
        <p className="flex justify-center gap-3">
          <Link href="/terms" className="hover:text-foreground underline underline-offset-2">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground underline underline-offset-2">
            Privacy
          </Link>
          <Link href="/refund-policy" className="hover:text-foreground underline underline-offset-2">
            Refund policy
          </Link>
        </p>
      </footer>
    </div>
  );
}
