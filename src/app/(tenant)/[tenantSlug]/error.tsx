"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/shared/components/ui/button";
import { defaultLocale, getDictionary, locales, LOCALE_COOKIE, type Locale } from "@/shared/i18n/dictionary";

/** Client-safe locale read (no `next/headers`, which `"use client"` files
 * can't import even transitively) — parses the same cookie
 * `getVisitorLocale`/the language switcher use server-side. Defaults to
 * Arabic on the very first render (before this effect runs), matching the
 * server's own default-when-unset behavior. */
function readLocaleCookie(): Locale {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : undefined;
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}

/**
 * Tenant-scoped error boundary — catches runtime errors anywhere under
 * `[tenantSlug]` instead of falling through to the root `error.tsx`, which
 * is generic ("contact support", no branding) and offers no way back into
 * the site. Like `not-found.tsx`, this file never receives route `params`,
 * so the tenant slug is recovered from `usePathname()`.
 */
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const tenantSlug = pathname.split("/").filter(Boolean)[0] ?? "";
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const dict = getDictionary(locale);

  useEffect(() => {
    setLocale(readLocaleCookie());
  }, []);

  useEffect(() => {
    console.error("[StorefrontError]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <p className="text-brand-sage text-xs font-semibold tracking-[0.14em] uppercase">
        {dict.errorBoundary.eyebrow}
      </p>
      <h1 className="font-serif mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {dict.errorBoundary.title}
      </h1>
      <p className="text-muted-foreground mt-4 text-lg leading-relaxed">{dict.errorBoundary.body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" className="text-base" onClick={reset}>
          {dict.errorBoundary.tryAgain}
        </Button>
        <Button asChild size="lg" variant="outline" className="text-base">
          <Link href={`/${tenantSlug}`}>{dict.errorBoundary.backHome}</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="text-muted-foreground/60 mt-8 font-mono text-xs">Reference: {error.digest}</p>
      )}
    </div>
  );
}
