import { Compass } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { getDictionary } from "@/shared/i18n/dictionary";
import { getVisitorLocale } from "@/shared/lib/i18n/locale";

/**
 * Special Next.js file — rendered for any unmatched route or `notFound()`
 * call under `[tenantSlug]`, replacing the framework's bare default 404.
 *
 * Deliberately NOT a client component. In this app's Next.js version, a
 * `"use client"` `not-found.tsx` silently fails to render when triggered by
 * a thrown `notFound()` (confirmed by direct testing — the boundary fires,
 * but the client component's output never appears, leaving a blank page).
 * A plain server component renders correctly.
 *
 * That constraint means no hooks — and `not-found.tsx` never receives the
 * dynamic route's `params` either (also confirmed directly: params come
 * back undefined here even though the same param resolves fine one file
 * over in `layout.tsx`). So the tenant slug for the links below can't come
 * from React at all; the tiny inline, dependency-free script patches the
 * three hrefs from `window.location.pathname` after the static HTML loads.
 * `cookies()` (via `getVisitorLocale`), unlike `params`, works fine here —
 * it's not scoped to the matched route segment — so the copy itself is
 * still fully bilingual.
 */
export default async function StorefrontNotFound() {
  const locale = await getVisitorLocale();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <Compass className="text-primary/40 size-10" strokeWidth={1.5} />
      <p className="text-brand-sage mt-6 text-xs font-semibold tracking-[0.14em] uppercase">
        {dict.notFound.eyebrow}
      </p>
      <h1 className="font-serif mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {dict.notFound.title}
      </h1>
      <p className="text-muted-foreground mt-4 text-lg leading-relaxed">{dict.notFound.body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="text-base">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- href is patched client-side below; see file comment */}
          <a href="/" id="storefront-404-packages">
            {dict.notFound.browsePackages}
          </a>
        </Button>
        <Button asChild size="lg" variant="outline" className="text-base">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- href is patched client-side below; see file comment */}
          <a href="/" id="storefront-404-home">
            {dict.notFound.backHome}
          </a>
        </Button>
      </div>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- href is patched client-side below; see file comment */}
      <a href="/" id="storefront-404-contact" className="text-muted-foreground hover:text-foreground mt-8 text-sm underline underline-offset-2">
        {dict.notFound.contactDirectly}
      </a>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
            var base = "/" + (location.pathname.split("/").filter(Boolean)[0] || "");
            var links = {
              "storefront-404-packages": base + "/packages",
              "storefront-404-home": base,
              "storefront-404-contact": base + "/contact"
            };
            for (var id in links) {
              var el = document.getElementById(id);
              if (el) el.setAttribute("href", links[id]);
            }
          })();`,
        }}
      />
    </div>
  );
}
