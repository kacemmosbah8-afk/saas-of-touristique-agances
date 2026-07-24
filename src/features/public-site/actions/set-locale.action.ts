"use server";

import { cookies } from "next/headers";

import { locales, type Locale } from "@/shared/i18n/dictionary";
import { LOCALE_COOKIE } from "@/shared/lib/i18n/locale";

/**
 * Persists the visitor's language choice so it applies to every subsequent
 * page, not just the one they switched from. Public/anonymous — no session,
 * no tenant scoping needed, since the cookie only ever affects which
 * language the same browser sees on its next request.
 */
export async function setLocaleAction(locale: Locale): Promise<void> {
  if (!locales.includes(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
