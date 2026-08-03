"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
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
import { setLocaleAction } from "@/features/public-site/actions/set-locale.action";
import { GlobalSearchBox } from "@/features/search/components/global-search-box";
import { Logo } from "@/shared/components/brand/logo";
import { IconChip } from "@/shared/components/brand/icon-chip";
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
import { locales, type Locale } from "@/shared/i18n/dictionary";
// Narrow import — NOT the ~90KB monolithic admin dictionary. DashboardShell
// renders on every admin page via the shared layout, but only ever needs
// the small `shell` slice (sidebar nav labels, sign-out, search
// placeholder), so it gets its own standalone dictionary module instead of
// pulling in every other admin feature's translations too.
import { getShellDict, type ShellDict } from "@/shared/i18n/admin-dictionary/shell";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type NavKey =
  | "dashboard"
  | "customers"
  | "leads"
  | "bookingRequests"
  | "quotes"
  | "bookings"
  | "documents"
  | "packages"
  | "flights"
  | "hotels"
  | "transportation"
  | "guides"
  | "suppliers"
  | "activities"
  | "destinations"
  | "settings";

type NavItem = { key: NavKey; icon: LucideIcon; href: (slug: string) => string };

const NAV_SECTIONS: { key: "overview" | "sales" | "operations" | "inventory" | "system"; items: NavItem[] }[] = [
  {
    key: "overview",
    items: [{ key: "dashboard", icon: LayoutDashboard, href: (slug: string) => `/${slug}/admin` }],
  },
  {
    key: "sales",
    items: [
      { key: "customers", icon: Users, href: (slug: string) => `/${slug}/admin/customers` },
      { key: "leads", icon: Filter, href: (slug: string) => `/${slug}/admin/leads` },
      {
        key: "bookingRequests",
        icon: ClipboardList,
        href: (slug: string) => `/${slug}/admin/booking-requests`,
      },
      { key: "quotes", icon: FileSignature, href: (slug: string) => `/${slug}/admin/quotes` },
    ],
  },
  {
    key: "operations",
    items: [
      { key: "bookings", icon: CalendarCheck, href: (slug: string) => `/${slug}/admin/bookings` },
      { key: "documents", icon: FileText, href: (slug: string) => `/${slug}/admin/documents` },
    ],
  },
  {
    key: "inventory",
    items: [
      { key: "packages", icon: Package, href: (slug: string) => `/${slug}/admin/packages` },
      { key: "flights", icon: PlaneTakeoff, href: (slug: string) => `/${slug}/admin/flights` },
      { key: "hotels", icon: Building2, href: (slug: string) => `/${slug}/admin/hotels` },
      { key: "transportation", icon: Bus, href: (slug: string) => `/${slug}/admin/transport` },
      { key: "guides", icon: UserRound, href: (slug: string) => `/${slug}/admin/guides` },
      { key: "suppliers", icon: Handshake, href: (slug: string) => `/${slug}/admin/suppliers` },
      { key: "activities", icon: Ticket, href: (slug: string) => `/${slug}/admin/activities` },
      {
        key: "destinations",
        icon: MapPin,
        href: (slug: string) => `/${slug}/admin/destinations`,
      },
    ],
  },
  {
    key: "system",
    items: [{ key: "settings", icon: Settings, href: (slug: string) => `/${slug}/admin/settings` }],
  },
];

function NavLinks({
  tenantSlug,
  pathname,
  onNavigate,
  nav,
}: {
  tenantSlug: string;
  pathname: string;
  onNavigate?: () => void;
  nav: ShellDict["nav"];
}) {
  function isActive(href: string) {
    // Exact match for the admin root route; prefix match for nested routes
    if (href === `/${tenantSlug}/admin`) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex flex-col p-2 pb-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.key}>
          <p className="text-muted-foreground/70 px-3 pt-4 pb-1 text-[11px] font-medium tracking-wider uppercase">
            {nav[section.key]}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map(({ key, icon: Icon, href }) => {
              const to = href(tenantSlug);
              const active = isActive(to);
              return (
                <Link
                  key={key}
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
                      className="bg-primary absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full rtl:right-0 rtl:left-auto"
                    />
                  ) : null}
                  <IconChip icon={Icon} size={22} />
                  {nav[key]}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      {locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="opacity-30">/</span>}
          <button
            type="button"
            onClick={() => switchTo(l)}
            disabled={isPending}
            aria-current={l === locale ? "true" : undefined}
            className={cn(
              "rounded-xs uppercase transition-colors disabled:pointer-events-none disabled:opacity-50",
              l === locale
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-primary",
            )}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}

export function DashboardShell({
  tenantName,
  tenantSlug,
  userName,
  role,
  locale,
  children,
}: {
  tenantName: string;
  tenantSlug: string;
  userName: string;
  role: MembershipRole;
  locale: Locale;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = React.useState(false);
  const dict = getShellDict(locale);
  const roleLabel = dict.roleLabels[role];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-ms-2 size-9 md:hidden"
                aria-label={dict.openMenu}
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={locale === "ar" ? "left" : "right"} className="w-64 p-0 sm:max-w-64">
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2 text-start">
                  {tenantName}
                  <Badge variant="secondary" className="text-xs">
                    {roleLabel}
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <NavLinks
                  tenantSlug={tenantSlug}
                  pathname={pathname}
                  onNavigate={() => setNavOpen(false)}
                  nav={dict.nav}
                />
              </div>
            </SheetContent>
          </Sheet>
          <Logo size={32} className="hidden shrink-0 sm:block" />
          <span className="truncate text-sm font-semibold tracking-tight">{tenantName}</span>
          <Badge variant="secondary" className="hidden text-xs sm:inline-flex">
            {roleLabel}
          </Badge>
        </div>

        <div className="mx-4 hidden w-full max-w-md flex-1 sm:block">
          <GlobalSearchBox
            tenantSlug={tenantSlug}
            shortcut
            placeholder={dict.searchPlaceholder}
            locale={locale}
          />
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle locale={locale} />
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
              <DropdownMenuItem onSelect={() => signOutAction()}>{dict.signOut}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-e md:flex md:flex-col">
          <NavLinks tenantSlug={tenantSlug} pathname={pathname} nav={dict.nav} />
        </aside>

        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
