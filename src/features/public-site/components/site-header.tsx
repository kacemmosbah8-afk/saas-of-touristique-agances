"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";

type Props = {
  tenantSlug: string;
  agencyName: string;
  logoUrl: string | null;
};

const NAV_LINKS = [
  { label: "Packages", segment: "packages" },
  { label: "Flights", segment: "flights" },
  { label: "Hotels", segment: "hotels" },
  { label: "Destinations", segment: "destinations" },
  { label: "Activities", segment: "activities" },
  { label: "Contact", segment: "contact" },
] as const;

/** Routes that open on a full-bleed hero image the header should float over:
 * the homepage and every single-item detail page. List pages keep a normal
 * solid header from first paint. */
function isHeroRoute(pathname: string, tenantSlug: string): boolean {
  const root = `/${tenantSlug}`;
  if (pathname === root) return true;
  const detailPattern = new RegExp(
    `^${root}/(packages|hotels|destinations|activities|flights)/[^/]+/?$`,
  );
  return detailPattern.test(pathname);
}

/**
 * The agency's own public header — deliberately not a reuse of
 * `shared/components/brand/logo.tsx` (TravelOS's own hardcoded mark). If
 * the agency hasn't uploaded a logo yet, this renders their name as plain
 * text rather than falling back to any placeholder mark.
 *
 * On hero routes the header floats transparent over the opening image
 * (design strategy, "navigation recedes over the hero, then commits") and
 * crossfades to a solid bar once the hero scrolls past — everywhere else
 * it's a normal solid sticky header from first paint.
 */
export function SiteHeader({ tenantSlug, agencyName, logoUrl }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const hero = isHeroRoute(pathname, tenantSlug);

  useEffect(() => {
    if (!hero) return;
    const onScroll = () => setScrolled(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hero]);

  const floating = hero && !scrolled;

  return (
    <header
      className={cn(
        "inset-x-0 top-0 z-40 transition-colors duration-300",
        hero ? "fixed" : "sticky",
        floating
          ? "bg-transparent"
          : "bg-background/95 border-b shadow-[0_1px_0_0_rgba(0,0,0,0.02)] backdrop-blur",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href={`/${tenantSlug}`}
          className={cn(
            "flex min-w-0 items-center gap-2.5 font-semibold transition-colors",
            floating && "text-white",
          )}
        >
          {logoUrl ? (
            <span className="relative block size-9 shrink-0">
              <Image
                src={logoUrl}
                alt={agencyName}
                fill
                className="rounded-md object-contain"
                sizes="36px"
              />
            </span>
          ) : null}
          <span className="truncate text-lg tracking-tight">{agencyName}</span>
        </Link>

        <nav
          className={cn(
            "hidden items-center gap-7 text-sm font-medium transition-colors md:flex",
            floating && "text-white/90",
          )}
        >
          {NAV_LINKS.map(({ label, segment }) => (
            <Link
              key={segment}
              href={`/${tenantSlug}/${segment}`}
              className={cn(
                "hover:text-primary relative transition-colors",
                floating && "hover:text-white",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "-mr-2 size-10 md:hidden",
                floating && "text-white hover:bg-white/15 hover:text-white",
              )}
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="bg-background w-full gap-0 border-none p-0 sm:max-w-full"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-6 py-5">
                <span className="font-serif text-lg font-semibold tracking-tight">
                  {agencyName}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  aria-label="Close navigation menu"
                  onClick={() => setOpen(false)}
                >
                  <X className="size-5" />
                </Button>
              </div>

              <nav className="flex flex-1 flex-col justify-center gap-1 px-6">
                {NAV_LINKS.map(({ label, segment }, i) => {
                  const href = `/${tenantSlug}/${segment}`;
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={segment}
                      href={href}
                      onClick={() => setOpen(false)}
                      style={{ transitionDelay: open ? `${i * 35}ms` : "0ms" }}
                      className={cn(
                        "font-serif border-border/60 flex items-center justify-between border-b py-4 text-3xl font-semibold tracking-tight transition-colors",
                        active ? "text-primary" : "hover:text-primary",
                      )}
                    >
                      {label}
                      <ArrowUpRight className="text-muted-foreground size-5" aria-hidden />
                    </Link>
                  );
                })}
              </nav>

              <div className="p-6">
                <Button asChild size="lg" className="w-full text-base">
                  <Link href={`/${tenantSlug}/packages`} onClick={() => setOpen(false)}>
                    Browse Packages
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
