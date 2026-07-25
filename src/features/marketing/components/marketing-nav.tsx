import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Logo } from "@/shared/components/brand/logo";
import { siteConfig } from "@/features/marketing/lib/site-config";

/**
 * Minimal header for the handful of standalone legal pages left in the
 * `(marketing)` group (Terms, Privacy, Refund, Cookie policy) now that the
 * old SaaS marketing pages (About/Features/Solutions/Contact) are gone —
 * see PROJECT.md, single-agency licensing. No product nav links left to
 * show; "Sign in" is the one real, live destination.
 */
export function MarketingNav() {
  return (
    <header className="border-border/60 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-serif text-lg font-semibold tracking-tight"
        >
          <Logo size={26} />
          {siteConfig.name}
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </header>
  );
}
