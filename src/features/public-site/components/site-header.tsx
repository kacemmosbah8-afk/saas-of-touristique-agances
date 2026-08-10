"use client";

import { useEffect, useRef, useState } from "react";
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
import { Logo } from "@/shared/components/brand/logo";
import { cn } from "@/shared/lib/utils";
import { type Dictionary, type Locale, localeDir } from "@/shared/i18n/dictionary";
import { LanguageSwitcher } from "@/features/public-site/components/language-switcher";

type Props = {
  tenantSlug: string;
  agencyName: string;
  dict: Dictionary;
  locale: Locale;
  /** Whether the agency has opted into French at all (Settings → Public
   * Website). The switcher itself never shows otherwise — without it there's
   * no way for a visitor to set the cookie to "fr" in the first place, so
   * hiding it here is sufficient to keep the site Arabic-only end to end. */
  frenchEnabled: boolean;
};

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
 * The agency's own public header. Reuses `shared/components/brand/logo.tsx`
 * — now that this is a single-customer build, the public site's logo and
 * TravelOS's own dashboard/marketing logo are the same fixed asset, not two
 * separate things to keep in sync.
 *
 * On hero routes the header floats transparent over the opening image
 * (design strategy, "navigation recedes over the hero, then commits") and
 * crossfades to a solid bar once the hero scrolls past — everywhere else
 * it's a normal solid sticky header from first paint.
 */
export function SiteHeader({ tenantSlug, agencyName, dict, locale, frenchEnabled }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const hero = isHeroRoute(pathname, tenantSlug);
  // Sheet side names its edge in physical (viewport) terms, not logical
  // (start/end) terms, so it needs an explicit flip for RTL — unlike layout
  // spacing, this can't be solved by a logical Tailwind class alone.
  const sheetSide = localeDir[locale] === "rtl" ? "left" : "right";

  const navLinks = [
    { label: dict.nav.home, segment: "" },
    { label: dict.nav.packages, segment: "packages" },
    { label: dict.nav.flights, segment: "flights" },
    { label: dict.nav.hotels, segment: "hotels" },
    { label: dict.nav.destinations, segment: "destinations" },
    { label: dict.nav.activities, segment: "activities" },
    { label: dict.nav.visaAssistance, segment: "visa-assistance" },
    { label: dict.nav.contact, segment: "contact" },
  ] as const;

  useEffect(() => {
    if (!hero) return;
    const onScroll = () => setScrolled(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hero]);

  // Hero sections pad themselves down by this header's real height (instead
  // of a guessed constant) so the floating header never overlaps the hero's
  // title/CTA — measured live since the header's height can vary (e.g. a
  // longer French nav label wrapping) in ways a fixed value can't predict.
  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const setVar = () =>
      document.documentElement.style.setProperty("--site-header-h", `${node.offsetHeight}px`);
    setVar();
    const observer = new ResizeObserver(setVar);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const floating = hero && !scrolled;

  return (
    <header
      ref={headerRef}
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
          <Logo size={52} className="shrink-0" />
          <span className="truncate text-lg tracking-tight">{agencyName}</span>
        </Link>

        <nav
          className={cn(
            "hidden items-center gap-7 text-sm font-medium transition-colors md:flex",
            floating && "text-white/90",
          )}
        >
          {navLinks.map(({ label, segment }) => (
            <Link
              key={segment || "home"}
              href={segment ? `/${tenantSlug}/${segment}` : `/${tenantSlug}`}
              className={cn(
                "hover:text-primary relative transition-colors",
                floating && "hover:text-white",
              )}
            >
              {label}
            </Link>
          ))}
          {frenchEnabled && <LanguageSwitcher currentLocale={locale} floating={floating} />}
          <Button asChild size="sm">
            <Link href={`/${tenantSlug}/plan-trip`}>{dict.nav.planTrip}</Link>
          </Button>
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "-me-2 size-10 md:hidden",
                floating && "text-white hover:bg-white/15 hover:text-white",
              )}
              aria-label={dict.nav.openMenu}
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side={sheetSide}
            showCloseButton={false}
            className="bg-background w-full gap-0 border-none p-0 sm:max-w-full"
          >
            <SheetTitle className="sr-only">{dict.nav.menuLabel}</SheetTitle>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-6 py-5">
                <Link
                  href={`/${tenantSlug}`}
                  onClick={() => setOpen(false)}
                  className="font-serif text-lg font-semibold tracking-tight"
                >
                  {agencyName}
                </Link>
                <div className="flex items-center gap-3">
                  {frenchEnabled && <LanguageSwitcher currentLocale={locale} />}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10"
                    aria-label={dict.nav.closeMenu}
                    onClick={() => setOpen(false)}
                  >
                    <X className="size-5" />
                  </Button>
                </div>
              </div>

              <nav className="flex flex-1 flex-col justify-center gap-1 px-6">
                {navLinks.map(({ label, segment }, i) => {
                  const href = segment ? `/${tenantSlug}/${segment}` : `/${tenantSlug}`;
                  const active = pathname === href || (segment !== "" && pathname.startsWith(`${href}/`));
                  return (
                    <Link
                      key={segment || "home"}
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

              <div className="space-y-2 p-6">
                <Button asChild size="lg" className="w-full text-base">
                  <Link href={`/${tenantSlug}/plan-trip`} onClick={() => setOpen(false)}>
                    {dict.nav.planTrip}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="w-full text-base">
                  <Link href={`/${tenantSlug}/packages`} onClick={() => setOpen(false)}>
                    {dict.hero.browsePackages}
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
