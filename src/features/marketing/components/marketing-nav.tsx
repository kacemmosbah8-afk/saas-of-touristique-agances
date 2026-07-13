"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { MAIN_NAV_LINKS } from "@/features/marketing/lib/nav-links";
import { Button } from "@/shared/components/ui/button";

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight" onClick={() => setOpen(false)}>
          TravelOS
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {MAIN_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>

        <button
          type="button"
          className="text-foreground md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-border/60 flex flex-col gap-1 border-t px-6 py-4 md:hidden">
          {MAIN_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground rounded-md px-2 py-2 text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t pt-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-in" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up" onClick={() => setOpen(false)}>
                Get started
              </Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
