"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { setLocaleAction } from "@/features/public-site/actions/set-locale.action";
import { locales, getDictionary, type Locale } from "@/shared/i18n/dictionary";
import { cn } from "@/shared/lib/utils";

type Props = {
  currentLocale: Locale;
  /** Matches the header's "floating white text over the hero image" state —
   * see `SiteHeader` — so the switcher stays legible in both header states. */
  floating?: boolean;
  className?: string;
};

/**
 * Two-letter AR/FR toggle, reachable from the header on every page (desktop
 * nav and the mobile menu) so a visitor can switch language from anywhere,
 * not just a settings page. Persists the choice via a cookie (`setLocaleAction`)
 * and refreshes the current route so every server-rendered piece of the page
 * — content, chrome copy, `dir`/`lang`, metadata on the next navigation —
 * updates together, instead of only the switcher itself changing.
 */
export function LanguageSwitcher({ currentLocale, floating, className }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const dict = getDictionary(currentLocale);

  function switchTo(locale: Locale) {
    if (locale === currentLocale || isPending) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <div
      className={cn("flex items-center gap-1.5 text-sm font-medium", floating && "text-white/90", className)}
      role="group"
      aria-label={dict.languageSwitcher.label}
    >
      {locales.map((locale, i) => (
        <span key={locale} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden className={cn("opacity-30", floating && "text-white")}>/</span>}
          <button
            type="button"
            onClick={() => switchTo(locale)}
            disabled={isPending}
            aria-current={locale === currentLocale ? "true" : undefined}
            className={cn(
              "rounded-xs uppercase transition-colors disabled:pointer-events-none disabled:opacity-50",
              locale === currentLocale
                ? floating
                  ? "text-white font-semibold"
                  : "text-foreground font-semibold"
                : floating
                  ? "text-white/70 hover:text-white"
                  : "text-muted-foreground hover:text-primary",
            )}
          >
            {locale}
          </button>
        </span>
      ))}
    </div>
  );
}
