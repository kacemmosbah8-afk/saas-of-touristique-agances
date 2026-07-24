"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MembershipRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Building2,
  Bus,
  UserRound,
  Handshake,
  Ticket,
  MapPin,
  Users,
  Filter,
  CalendarCheck,
  FileSignature,
  FileText,
  Settings,
  Menu,
  PlaneTakeoff,
  ClipboardList,
} from "lucide-react";

import { signOutAction } from "@/features/auth/actions/sign-out.action";
import { GlobalSearchBox } from "@/features/search/components/global-search-box";
import { Logo } from "@/shared/components/brand/logo";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type NavItem = { label: string; icon: LucideIcon; href: (slug: string) => string };

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: (slug: string) => `/${slug}/admin` },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Customers", icon: Users, href: (slug: string) => `/${slug}/admin/customers` },
      { label: "Leads", icon: Filter, href: (slug: string) => `/${slug}/admin/leads` },
      {
        label: "Booking Requests",
        icon: ClipboardList,
        href: (slug: string) => `/${slug}/admin/booking-requests`,
      },
      { label: "Quotes", icon: FileSignature, href: (slug: string) => `/${slug}/admin/quotes` },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Bookings",
        icon: CalendarCheck,
        href: (slug: string) => `/${slug}/admin/bookings`,
      },
      { label: "Documents", icon: FileText, href: (slug: string) => `/${slug}/admin/documents` },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Packages", icon: Package, href: (slug: string) => `/${slug}/admin/packages` },
      { label: "Flights", icon: PlaneTakeoff, href: (slug: string) => `/${slug}/admin/flights` },
      { label: "Hotels", icon: Building2, href: (slug: string) => `/${slug}/admin/hotels` },
      { label: "Transportation", icon: Bus, href: (slug: string) => `/${slug}/admin/transport` },
      { label: "Guides", icon: UserRound, href: (slug: string) => `/${slug}/admin/guides` },
      {
        label: "Suppliers",
        icon: Handshake,
        href: (slug: string) => `/${slug}/admin/suppliers`,
      },
      { label: "Activities", icon: Ticket, href: (slug: string) => `/${slug}/admin/activities` },
      {
        label: "Destinations",
        icon: MapPin,
        href: (slug: string) => `/${slug}/admin/destinations`,
      },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", icon: Settings, href: (slug: string) => `/${slug}/admin/settings` },
    ],
  },
];

function NavLinks({
  tenantSlug,
  pathname,
  onNavigate,
}: {
  tenantSlug: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  function isActive(href: string) {
    // Exact match for the admin root route; prefix match for nested routes
    if (href === `/${tenantSlug}/admin`) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex flex-col p-2 pb-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="text-muted-foreground/70 px-3 pt-4 pb-1 text-[11px] font-medium tracking-wider uppercase">
            {section.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map(({ label, icon: Icon, href }) => {
              const to = href(tenantSlug);
              const active = isActive(to);
              return (
                <Link
                  key={label}
                  href={to}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="bg-primary absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full"
                    />
                  ) : null}
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function DashboardShell({
  tenantName,
  tenantSlug,
  userName,
  role,
  children,
}: {
  tenantName: string;
  tenantSlug: string;
  userName: string;
  role: MembershipRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 size-9 md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 sm:max-w-64">
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2 text-left">
                  {tenantName}
                  <Badge variant="secondary" className="text-xs capitalize">
                    {role.toLowerCase()}
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <NavLinks
                  tenantSlug={tenantSlug}
                  pathname={pathname}
                  onNavigate={() => setNavOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
          <Logo size={22} className="hidden shrink-0 sm:block" />
          <span className="truncate text-sm font-semibold tracking-tight">{tenantName}</span>
          <Badge variant="secondary" className="hidden text-xs capitalize sm:inline-flex">
            {role.toLowerCase()}
          </Badge>
        </div>

        <div className="mx-4 hidden w-full max-w-md flex-1 sm:block">
          <GlobalSearchBox tenantSlug={tenantSlug} shortcut />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials(userName)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:block">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => signOutAction()}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r md:flex md:flex-col">
          <NavLinks tenantSlug={tenantSlug} pathname={pathname} />
        </aside>

        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
