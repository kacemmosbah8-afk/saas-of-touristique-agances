import { cookies } from "next/headers";

import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from "@/shared/i18n/dictionary";

export { LOCALE_COOKIE };

/**
 * The storefront visitor's chosen language for this browser, read from a
 * cookie set by the language switcher. Every public page/layout calls this
 * instead of hardcoding `defaultLocale`, so the whole site — content,
 * chrome copy, and metadata — responds to the switch. Falls back to Arabic
 * (the agency's primary language) when no cookie is set yet, or when the
 * stored value isn't a locale this app recognizes.
 *
 * Server-only (imports `next/headers`) — client components that need the
 * locale (e.g. `error.tsx`, which Next.js requires to be client-side) must
 * read the `LOCALE_COOKIE` cookie themselves via `document.cookie` instead.
 */
export async function getVisitorLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale;
}
