"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MembershipRole } from "@prisma/client";
import {
  LayoutDashboard,
  Package,
  Building2,
  Bus,
  UserRound,
  Handshake,
  Ticket,
  MapPin,
  Settings,
} from "lucide-react";

import { signOutAction } from "@/features/auth/actions/sign-out.action";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: (slug: string) => `/${slug}` },
  { label: "Packages", icon: Package, href: (slug: string) => `/${slug}/packages` },
  { label: "Hotels", icon: Building2, href: (slug: string) => `/${slug}/hotels` },
  { label: "Transportation", icon: Bus, href: (slug: string) => `/${slug}/transport` },
  { label: "Guides", icon: UserRound, href: (slug: string) => `/${slug}/guides` },
  { label: "Suppliers", icon: Handshake, href: (slug: string) => `/${slug}/suppliers` },
  { label: "Activities", icon: Ticket, href: (slug: string) => `/${slug}/activities` },
  { label: "Destinations", icon: MapPin, href: (slug: string) => `/${slug}/destinations` },
  { label: "Settings", icon: Settings, href: (slug: string) => `/${slug}/settings` },
];

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

  function isActive(href: string) {
    // Exact match for the root tenant route; prefix match for nested routes
    if (href === `/${tenantSlug}`) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{tenantName}</span>
          <Badge variant="secondary" className="text-xs">
            {role}
          </Badge>
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
          <nav className="flex flex-col gap-1 p-2 pt-4">
            {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
              const to = href(tenantSlug);
              const active = isActive(to);
              return (
                <Link
                  key={label}
                  href={to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
