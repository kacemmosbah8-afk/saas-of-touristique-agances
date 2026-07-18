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
  { href: "messages", label: "Messages" },
] as const;

/**
 * The signed-in portal chrome — deliberately its own header, not a reuse of
 * the staff dashboard's sidebar. A traveler should never see agency-
 * operations navigation (Suppliers, Settings, CRM, …); giving the portal
 * its own minimal, trip-focused header is what keeps that boundary visible
 * in the UI itself, not just enforced server-side.
 *
 * Mobile note: the portal is used mostly on phones. The row is flex-wrap
 * with tightened nav padding below `sm`, so on a ~360px viewport the nav
 * either fits on one line or wraps to a clean second row under the brand —
 * it never overflows, and three links don't warrant a drawer.
 */
export function PortalHeader({ tenantSlug, tenantName, customerFirstName }: Props) {
  const signOut = portalSignOutAction.bind(null, tenantSlug);

  return (
    <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 print:hidden">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href={`/portal/${tenantSlug}/dashboard`}
          className="flex min-w-0 items-center gap-2.5"
          aria-label={`${tenantName} — your trips`}
        >
          <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Plane className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">{tenantName}</p>
            <p className="text-muted-foreground truncate text-xs">
              Trip portal{customerFirstName ? ` · ${customerFirstName}` : ""}
            </p>
          </div>
        </Link>

        <nav aria-label="Portal" className="-mx-1.5 flex items-center gap-0.5 sm:mx-0 sm:gap-1">
          {NAV.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" asChild className="px-2 text-sm sm:px-3">
              <Link href={`/portal/${tenantSlug}/${item.href}`}>{item.label}</Link>
            </Button>
          ))}
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground px-2 text-sm sm:px-3">
              Sign out
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
