import Link from "next/link";
import { Plane } from "lucide-react";

import { portalSignOutAction } from "@/features/portal/actions/session.action";
import { Button } from "@/shared/components/ui/button";

type Props = {
  tenantSlug: string;
  tenantName: string;
  customerFirstName?: string;
};

const NAV = [
  { href: "dashboard", label: "Trips" },
  { href: "payments", label: "Payments" },
  { href: "messages", label: "Messages" },
] as const;

/**
 * The signed-in portal chrome — deliberately its own header, not a reuse of
 * the staff dashboard's sidebar. A traveler should never see agency-
 * operations navigation (Suppliers, Settings, CRM, …); giving the portal
 * its own minimal, trip-focused header is what keeps that boundary visible
 * in the UI itself, not just enforced server-side.
 */
export function PortalHeader({ tenantSlug, tenantName, customerFirstName }: Props) {
  const signOut = portalSignOutAction.bind(null, tenantSlug);

  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 print:hidden">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Plane className="size-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{tenantName}</p>
            <p className="text-muted-foreground text-xs">Trip portal{customerFirstName ? ` · ${customerFirstName}` : ""}</p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" asChild className="text-sm">
              <Link href={`/portal/${tenantSlug}/${item.href}`}>{item.label}</Link>
            </Button>
          ))}
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground text-sm">
              Sign out
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
